const { getPool, sql } = require('../config/db');
const { queueCode, queueEntryCode } = require('../utils/codeGenerator');

class QueueRepository {
  async findAll() {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        qe.queue_entry_code AS id,
        uc.user_code AS userId,
        qe.display_name AS name,
        qe.student_id AS studentId,
        s.service_code AS serviceId,
        qe.service_name_snapshot AS serviceName,
        qe.priority,
        qe.status,
        qe.joined_at AS joinedAt,
        qe.notes,
        served_by.user_code AS servedByAdminUserId,
        qe.entry_source AS entrySource,
        qe.left_at AS leftAt,
        qe.cancel_reason AS cancelReason,
        qe.appointment_id AS appointmentId
      FROM queue_entries qe
      JOIN user_credentials uc ON uc.id = qe.user_id
      JOIN services s ON s.id = qe.service_id
      LEFT JOIN user_credentials served_by ON served_by.id = qe.served_by_admin_user_id
    `);
    return result.recordset;
  }

  async findById(id) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('queue_entry_code', sql.VarChar(20), String(id))
      .query(`
        SELECT TOP 1
          qe.queue_entry_code AS id,
          uc.user_code AS userId,
          qe.display_name AS name,
          qe.student_id AS studentId,
          s.service_code AS serviceId,
          qe.service_name_snapshot AS serviceName,
          qe.priority,
          qe.status,
          qe.joined_at AS joinedAt,
          qe.notes,
          served_by.user_code AS servedByAdminUserId,
          qe.entry_source AS entrySource,
          qe.left_at AS leftAt,
          qe.cancel_reason AS cancelReason,
          qe.appointment_id AS appointmentId
        FROM queue_entries qe
        JOIN user_credentials uc ON uc.id = qe.user_id
        JOIN services s ON s.id = qe.service_id
        LEFT JOIN user_credentials served_by ON served_by.id = qe.served_by_admin_user_id
        WHERE qe.queue_entry_code = @queue_entry_code
      `);
    return result.recordset[0] || null;
  }

  async findByStudentId(studentId) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('student_id', sql.VarChar(20), String(studentId))
      .query(`
        SELECT TOP 1
          qe.queue_entry_code AS id,
          uc.user_code AS userId,
          qe.display_name AS name,
          qe.student_id AS studentId,
          s.service_code AS serviceId,
          qe.service_name_snapshot AS serviceName,
          qe.priority,
          qe.status,
          qe.joined_at AS joinedAt,
          qe.notes,
          served_by.user_code AS servedByAdminUserId,
          qe.entry_source AS entrySource,
          qe.left_at AS leftAt,
          qe.cancel_reason AS cancelReason,
          qe.appointment_id AS appointmentId
        FROM queue_entries qe
        JOIN user_credentials uc ON uc.id = qe.user_id
        JOIN services s ON s.id = qe.service_id
        LEFT JOIN user_credentials served_by ON served_by.id = qe.served_by_admin_user_id
        WHERE qe.student_id = @student_id
        ORDER BY qe.joined_at DESC
      `);
    return result.recordset[0] || null;
  }

  async create(queueItem) {
    const pool = await getPool();

    // Ensure an open queue exists for the service; create if missing.
    const ensureQueue = await pool
      .request()
      .input('service_code', sql.VarChar(20), String(queueItem.serviceId))
      .query(`
        SELECT TOP 1 q.id AS queueId
        FROM queues q
        JOIN services s ON s.id = q.service_id
        WHERE s.service_code = @service_code AND q.status = 'open'
        ORDER BY q.created_at DESC
      `);

    let queueId = ensureQueue.recordset[0]?.queueId;
    if (!queueId) {
      const created = await pool
        .request()
        .input('queue_code', sql.VarChar(20), queueCode())
        .input('service_code', sql.VarChar(20), String(queueItem.serviceId))
        .query(`
          INSERT INTO queues (queue_code, service_id, status)
          OUTPUT INSERTED.id AS queueId
          VALUES (
            @queue_code,
            (SELECT TOP 1 id FROM services WHERE service_code = @service_code),
            'open'
          )
        `);
      queueId = created.recordset[0]?.queueId;
    }

    const provided =
      queueItem.queueEntryCode ||
      queueItem.id ||
      null;
    const code =
      provided && String(provided).length <= 20
        ? String(provided)
        : queueEntryCode();
    const entrySource =
      queueItem.entrySource === 'appointment' || queueItem.entrySource === 'admin'
        ? queueItem.entrySource
        : 'walk-in';
    await pool
      .request()
      .input('queue_entry_code', sql.VarChar(20), code)
      .input('queue_id', sql.BigInt, queueId)
      .input('user_code', sql.VarChar(20), String(queueItem.userId))
      .input('service_code', sql.VarChar(20), String(queueItem.serviceId))
      .input('display_name', sql.VarChar(100), queueItem.name)
      .input('student_id', sql.VarChar(20), String(queueItem.studentId))
      .input('service_name_snapshot', sql.VarChar(100), String(queueItem.serviceName))
      .input('priority', sql.VarChar(10), queueItem.priority || 'normal')
      .input('status', sql.VarChar(20), queueItem.status || 'waiting')
      .input('notes', sql.VarChar(500), queueItem.notes || null)
      .input('entry_source', sql.VarChar(20), entrySource)
      .input('cancel_reason', sql.VarChar(100), queueItem.cancelReason || null)
      .input('appointment_id', sql.BigInt, queueItem.appointmentId ?? null)
      .input(
        'served_by_admin_code',
        sql.VarChar(20),
        queueItem.servedByAdminUserId ? String(queueItem.servedByAdminUserId) : null
      )
      .query(`
        INSERT INTO queue_entries (
          queue_entry_code,
          queue_id,
          user_id,
          service_id,
          display_name,
          student_id,
          service_name_snapshot,
          priority,
          status,
          notes,
          served_by_admin_user_id,
          entry_source,
          left_at,
          cancel_reason,
          appointment_id
        )
        VALUES (
          @queue_entry_code,
          @queue_id,
          (SELECT TOP 1 id FROM user_credentials WHERE user_code = @user_code),
          (SELECT TOP 1 id FROM services WHERE service_code = @service_code),
          @display_name,
          @student_id,
          @service_name_snapshot,
          @priority,
          @status,
          @notes,
          CASE
            WHEN @served_by_admin_code IS NULL THEN NULL
            ELSE (SELECT TOP 1 id FROM user_credentials WHERE user_code = @served_by_admin_code)
          END,
          @entry_source,
          NULL,
          @cancel_reason,
          @appointment_id
        )
      `);

    return this.findById(code);
  }

  async updateById(id, updates) {
    const pool = await getPool();
    const existing = await this.findById(id);
    if (!existing) return null;

    const nextStatus = updates.status ?? existing.status;
    const nextNotes = updates.notes ?? existing.notes ?? null;
    const nextEntrySource = updates.entrySource ?? existing.entrySource ?? 'walk-in';
    const nextCancelReason = updates.cancelReason ?? existing.cancelReason ?? null;

    const startedServingAt = nextStatus === 'serving' && existing.status !== 'serving' ? 'SET' : null;
    const completedAt = nextStatus === 'served' && existing.status !== 'served' ? 'SET' : null;
    const shouldSetLeftAt =
      !existing.leftAt && (nextStatus === 'left' || nextStatus === 'no-show');

    await pool
      .request()
      .input('queue_entry_code', sql.VarChar(20), String(id))
      .input('status', sql.VarChar(20), nextStatus)
      .input('notes', sql.VarChar(500), nextNotes)
      .input('entry_source', sql.VarChar(20), nextEntrySource)
      .input('cancel_reason', sql.VarChar(100), nextCancelReason)
      .input(
        'appointment_id',
        sql.BigInt,
        updates.appointmentId ?? existing.appointmentId ?? null
      )
      .input(
        'served_by_admin_code',
        sql.VarChar(20),
        updates.servedByAdminUserId ? String(updates.servedByAdminUserId) : null
      )
      .input('left_at', sql.DateTime, updates.leftAt ?? existing.leftAt ?? null)
      .query(`
        UPDATE queue_entries
        SET
          status = @status,
          notes = @notes,
          entry_source = @entry_source,
          cancel_reason = @cancel_reason,
          appointment_id = @appointment_id,
          served_by_admin_user_id = CASE
            WHEN @served_by_admin_code IS NULL THEN served_by_admin_user_id
            ELSE (SELECT TOP 1 id FROM user_credentials WHERE user_code = @served_by_admin_code)
          END,
          started_serving_at = CASE WHEN '${startedServingAt}' = 'SET' THEN GETDATE() ELSE started_serving_at END,
          completed_at = CASE WHEN '${completedAt}' = 'SET' THEN GETDATE() ELSE completed_at END,
          left_at = CASE
            WHEN '${shouldSetLeftAt ? 'SET' : ''}' = 'SET' THEN GETDATE()
            ELSE @left_at
          END,
          updated_at = GETDATE()
        WHERE queue_entry_code = @queue_entry_code
      `);

    return this.findById(id);
  }

  async removeById(id) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('queue_entry_code', sql.VarChar(20), String(id))
      .query(`
        DELETE FROM queue_entries
        WHERE queue_entry_code = @queue_entry_code
      `);
    return result.rowsAffected?.[0] > 0;
  }

  async findServing() {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TOP 1
        qe.queue_entry_code AS id,
        uc.user_code AS userId,
        qe.display_name AS name,
        qe.student_id AS studentId,
        s.service_code AS serviceId,
        qe.service_name_snapshot AS serviceName,
        qe.priority,
        qe.status,
        qe.joined_at AS joinedAt,
        qe.notes,
        served_by.user_code AS servedByAdminUserId,
        qe.entry_source AS entrySource,
        qe.left_at AS leftAt,
        qe.cancel_reason AS cancelReason,
        qe.appointment_id AS appointmentId
      FROM queue_entries qe
      JOIN user_credentials uc ON uc.id = qe.user_id
      JOIN services s ON s.id = qe.service_id
      LEFT JOIN user_credentials served_by ON served_by.id = qe.served_by_admin_user_id
      WHERE qe.status = 'serving'
      ORDER BY qe.started_serving_at ASC
    `);
    return result.recordset[0] || null;
  }

  async findNextWaiting() {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TOP 1
        qe.queue_entry_code AS id,
        uc.user_code AS userId,
        qe.display_name AS name,
        qe.student_id AS studentId,
        s.service_code AS serviceId,
        qe.service_name_snapshot AS serviceName,
        qe.priority,
        qe.status,
        qe.joined_at AS joinedAt,
        qe.notes,
        served_by.user_code AS servedByAdminUserId,
        qe.entry_source AS entrySource,
        qe.left_at AS leftAt,
        qe.cancel_reason AS cancelReason,
        qe.appointment_id AS appointmentId
      FROM queue_entries qe
      JOIN user_credentials uc ON uc.id = qe.user_id
      JOIN services s ON s.id = qe.service_id
      LEFT JOIN user_credentials served_by ON served_by.id = qe.served_by_admin_user_id
      WHERE qe.status = 'waiting'
      ORDER BY
        CASE qe.priority
          WHEN 'high' THEN 0
          WHEN 'medium' THEN 1
          WHEN 'normal' THEN 2
          WHEN 'low' THEN 3
          ELSE 2
        END ASC,
        qe.joined_at ASC
    `);
    return result.recordset[0] || null;
  }

  async countCompletedToday() {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT COUNT(1) AS total
      FROM queue_entries qe
      WHERE qe.status = 'served'
        AND CAST(COALESCE(qe.completed_at, qe.updated_at) AS DATE) = CAST(GETDATE() AS DATE)
    `);
    return Number(result.recordset[0]?.total || 0);
  }
}

module.exports = new QueueRepository();
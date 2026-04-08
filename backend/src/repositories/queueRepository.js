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
        qe.notes
      FROM queue_entries qe
      JOIN user_credentials uc ON uc.id = qe.user_id
      JOIN services s ON s.id = qe.service_id
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
          qe.notes
        FROM queue_entries qe
        JOIN user_credentials uc ON uc.id = qe.user_id
        JOIN services s ON s.id = qe.service_id
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
          qe.notes
        FROM queue_entries qe
        JOIN user_credentials uc ON uc.id = qe.user_id
        JOIN services s ON s.id = qe.service_id
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
          notes
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
          @notes
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

    const startedServingAt = nextStatus === 'serving' && existing.status !== 'serving' ? 'SET' : null;
    const completedAt = nextStatus === 'served' && existing.status !== 'served' ? 'SET' : null;

    await pool
      .request()
      .input('queue_entry_code', sql.VarChar(20), String(id))
      .input('status', sql.VarChar(20), nextStatus)
      .input('notes', sql.VarChar(500), nextNotes)
      .query(`
        UPDATE queue_entries
        SET
          status = @status,
          notes = @notes,
          started_serving_at = CASE WHEN '${startedServingAt}' = 'SET' THEN GETDATE() ELSE started_serving_at END,
          completed_at = CASE WHEN '${completedAt}' = 'SET' THEN GETDATE() ELSE completed_at END,
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
        qe.notes
      FROM queue_entries qe
      JOIN user_credentials uc ON uc.id = qe.user_id
      JOIN services s ON s.id = qe.service_id
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
        qe.notes
      FROM queue_entries qe
      JOIN user_credentials uc ON uc.id = qe.user_id
      JOIN services s ON s.id = qe.service_id
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
}

module.exports = new QueueRepository();
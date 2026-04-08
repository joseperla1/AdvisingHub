const { getPool, sql } = require('../config/db');
const { eventCode } = require('../utils/codeGenerator');

class HistoryService {
  async addHistoryEntry(payload) {
    const pool = await getPool();

    const status = String(payload.action || payload.status || 'sent');
    const allowed = new Set([
      'sent',
      'viewed',
      'joined',
      'left',
      'serving',
      'served',
      'no-show',
      'checked-in',
      'scheduled',
    ]);
    const normalizedStatus = allowed.has(status) ? status : 'sent';

    const message =
      payload.message ||
      `${payload.name || 'User'} ${payload.action || payload.status || 'updated'} (${payload.serviceName || payload.serviceId || ''})`.trim();

    const code = eventCode();
    await pool
      .request()
      .input('event_code', sql.VarChar(20), code)
      .input('user_code', sql.VarChar(20), String(payload.userId))
      .input('queue_entry_code', sql.VarChar(20), payload.queueId ? String(payload.queueId) : null)
      .input('appointment_code', sql.VarChar(20), payload.appointmentId ? String(payload.appointmentId) : null)
      .input('message', sql.VarChar(255), String(message).slice(0, 255))
      .input('action_type', sql.VarChar(50), payload.action ? String(payload.action).slice(0, 50) : null)
      .input('status', sql.VarChar(20), normalizedStatus)
      .query(`
        INSERT INTO notification_history (
          event_code,
          user_id,
          queue_entry_id,
          appointment_id,
          message,
          action_type,
          status
        )
        VALUES (
          @event_code,
          (SELECT TOP 1 id FROM user_credentials WHERE user_code = @user_code),
          CASE WHEN @queue_entry_code IS NULL THEN NULL
               ELSE (SELECT TOP 1 id FROM queue_entries WHERE queue_entry_code = @queue_entry_code) END,
          CASE WHEN @appointment_code IS NULL THEN NULL
               ELSE (SELECT TOP 1 id FROM appointments WHERE appointment_code = @appointment_code) END,
          @message,
          @action_type,
          @status
        )
      `);

    return {
      id: code,
      userId: payload.userId,
      queueId: payload.queueId ?? null,
      appointmentId: payload.appointmentId ?? null,
      action: payload.action ?? null,
      status: normalizedStatus,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Returns one row per queue ticket for the user (not every status update).
   * Shape aligns to frontend history view: { id, serviceName, joinedAt, leftAt }
   */
  async getHistoryByUserId(userId) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('user_code', sql.VarChar(20), String(userId))
      .query(`
        SELECT
          qe.queue_entry_code AS id,
          qe.service_name_snapshot AS serviceName,
          qe.joined_at AS joinedAt,
          CASE
            WHEN qe.status IN ('served', 'left', 'no-show', 'canceled') THEN COALESCE(qe.completed_at, qe.updated_at)
            ELSE NULL
          END AS leftAt
        FROM queue_entries qe
        JOIN user_credentials uc ON uc.id = qe.user_id
        WHERE uc.user_code = @user_code
        ORDER BY qe.joined_at DESC
      `);
    return result.recordset;
  }
}

module.exports = new HistoryService();
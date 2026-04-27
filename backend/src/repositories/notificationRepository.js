const { getPool, sql } = require('../config/db');
const { eventCode } = require('../utils/codeGenerator');

function mapTypeToStatus(type) {
  switch (type) {
    case 'queue_joined':
      return 'joined';
    case 'left':
      return 'left';
    case 'almost_ready':
      return 'sent';
    case 'serving':
      return 'serving';
    case 'served':
      return 'served';
    case 'no_show':
      return 'no-show';
    default:
      return 'sent';
  }
}

async function create(notification) {
  const pool = await getPool();
  const code = eventCode();
  const status = mapTypeToStatus(notification.type);

  await pool
    .request()
    .input('event_code', sql.VarChar(20), code)
    .input('user_code', sql.VarChar(20), String(notification.userId))
    .input('queue_entry_code', sql.VarChar(20), notification.queueId ? String(notification.queueId) : null)
    .input('message', sql.VarChar(255), String(notification.message).slice(0, 255))
    .input('action_type', sql.VarChar(50), String(notification.type).slice(0, 50))
    .input('status', sql.VarChar(20), status)
    .input('appointment_code', sql.VarChar(20), notification.appointmentId ? String(notification.appointmentId) : null)
    .query(`
      INSERT INTO notification_history (
        event_code,
        user_id,
        queue_entry_id,
        appointment_id,
        message,
        action_type,
        status,
        is_read,
        read_at,
        is_dismissed,
        dismissed_at,
        updated_at
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
        @status,
        0,
        NULL,
        0,
        NULL,
        GETDATE()
      )
    `);

  return {
    ...notification,
    id: code,
    createdAt: notification.createdAt || new Date().toISOString(),
    status,
  };
}

async function findAll() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      nh.event_code AS id,
      uc.user_code AS userId,
      qe.queue_entry_code AS queueId,
      nh.action_type AS type,
      nh.message,
      nh.created_at AS createdAt,
      nh.status,
      nh.is_read AS isRead,
      nh.read_at AS readAt,
      nh.is_dismissed AS isDismissed,
      nh.dismissed_at AS dismissedAt
    FROM notification_history nh
    JOIN user_credentials uc ON uc.id = nh.user_id
    LEFT JOIN queue_entries qe ON qe.id = nh.queue_entry_id
    ORDER BY nh.created_at DESC
  `);
  return result.recordset;
}

async function findByUserId(userId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('user_code', sql.VarChar(20), String(userId))
    .query(`
      SELECT
        nh.event_code AS id,
        uc.user_code AS userId,
        qe.queue_entry_code AS queueId,
        nh.action_type AS type,
        nh.message,
        nh.created_at AS createdAt,
        nh.status,
        nh.is_read AS isRead,
        nh.read_at AS readAt,
        nh.is_dismissed AS isDismissed,
        nh.dismissed_at AS dismissedAt
      FROM notification_history nh
      JOIN user_credentials uc ON uc.id = nh.user_id
      LEFT JOIN queue_entries qe ON qe.id = nh.queue_entry_id
      WHERE uc.user_code = @user_code
        AND ISNULL(nh.is_dismissed, 0) = 0
      ORDER BY nh.created_at DESC
    `);
  return result.recordset;
}

async function markReadForUser(userId, notificationId) {
  const pool = await getPool();
  await pool
    .request()
    .input('user_code', sql.VarChar(20), String(userId))
    .input('event_code', sql.VarChar(20), String(notificationId))
    .query(`
      UPDATE nh
      SET
        is_read = 1,
        read_at = COALESCE(read_at, GETDATE()),
        updated_at = GETDATE()
      FROM notification_history nh
      JOIN user_credentials uc ON uc.id = nh.user_id
      WHERE uc.user_code = @user_code
        AND nh.event_code = @event_code
    `);
}

async function dismissForUser(userId, notificationId) {
  const pool = await getPool();
  await pool
    .request()
    .input('user_code', sql.VarChar(20), String(userId))
    .input('event_code', sql.VarChar(20), String(notificationId))
    .query(`
      UPDATE nh
      SET
        is_read = 1,
        read_at = COALESCE(read_at, GETDATE()),
        is_dismissed = 1,
        dismissed_at = COALESCE(dismissed_at, GETDATE()),
        updated_at = GETDATE()
      FROM notification_history nh
      JOIN user_credentials uc ON uc.id = nh.user_id
      WHERE uc.user_code = @user_code
        AND nh.event_code = @event_code
    `);
}

async function markAllReadForUser(userId) {
  const pool = await getPool();
  await pool
    .request()
    .input('user_code', sql.VarChar(20), String(userId))
    .query(`
      UPDATE nh
      SET
        is_read = 1,
        read_at = COALESCE(read_at, GETDATE()),
        updated_at = GETDATE()
      FROM notification_history nh
      JOIN user_credentials uc ON uc.id = nh.user_id
      WHERE uc.user_code = @user_code
        AND ISNULL(nh.is_dismissed, 0) = 0
    `);
}

async function ensureTodayAppointmentReminders(userId) {
  const pool = await getPool();
  await pool
    .request()
    .input('user_code', sql.VarChar(20), String(userId))
    .query(`
      INSERT INTO notification_history (
        event_code,
        user_id,
        appointment_id,
        message,
        action_type,
        status,
        is_read,
        is_dismissed,
        updated_at
      )
      SELECT
        CONCAT('evt', CONVERT(VARCHAR(16), ABS(CHECKSUM(NEWID())))) AS event_code,
        uc.id AS user_id,
        a.id AS appointment_id,
        CONCAT(
          'Reminder: You have an appointment today at ',
          LEFT(CONVERT(VARCHAR(8), a.appointment_time, 108), 5),
          ' for ',
          a.service_name_snapshot,
          '.'
        ) AS message,
        'appointment_reminder_today' AS action_type,
        'sent' AS status,
        0 AS is_read,
        0 AS is_dismissed,
        GETDATE() AS updated_at
      FROM appointments a
      JOIN user_credentials uc ON uc.id = a.user_id
      WHERE uc.user_code = @user_code
        AND CAST(a.appointment_date AS DATE) = CAST(GETDATE() AS DATE)
        AND a.status IN ('Scheduled', 'Waiting')
        AND NOT EXISTS (
          SELECT 1
          FROM notification_history nh
          WHERE nh.user_id = uc.id
            AND nh.appointment_id = a.id
            AND nh.action_type = 'appointment_reminder_today'
        )
    `);
}

module.exports = {
  create,
  findAll,
  findByUserId,
  markReadForUser,
  dismissForUser,
  markAllReadForUser,
  ensureTodayAppointmentReminders,
};
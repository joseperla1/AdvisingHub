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
    .query(`
      INSERT INTO notification_history (
        event_code,
        user_id,
        queue_entry_id,
        message,
        action_type,
        status
      )
      VALUES (
        @event_code,
        (SELECT TOP 1 id FROM user_credentials WHERE user_code = @user_code),
        CASE WHEN @queue_entry_code IS NULL THEN NULL
             ELSE (SELECT TOP 1 id FROM queue_entries WHERE queue_entry_code = @queue_entry_code) END,
        @message,
        @action_type,
        @status
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
      nh.status
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
        nh.status
      FROM notification_history nh
      JOIN user_credentials uc ON uc.id = nh.user_id
      LEFT JOIN queue_entries qe ON qe.id = nh.queue_entry_id
      WHERE uc.user_code = @user_code
      ORDER BY nh.created_at DESC
    `);
  return result.recordset;
}

module.exports = {
  create,
  findAll,
  findByUserId,
};
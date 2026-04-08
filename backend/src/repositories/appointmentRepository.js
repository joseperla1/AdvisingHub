const { getPool, sql } = require('../config/db');
const { appointmentCode } = require('../utils/codeGenerator');

class AppointmentRepository {
  async findAll() {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        a.appointment_code AS id,
        uc.user_code AS userId,
        a.student_name AS studentName,
        a.student_id AS studentId,
        s.service_code AS serviceId,
        a.service_name_snapshot AS serviceName,
        adv.user_code AS advisorId,
        a.advisor_name_snapshot AS advisor,
        a.appointment_date AS appointmentDate,
        a.appointment_time AS appointmentTime,
        a.status,
        a.queue_position AS queuePosition,
        a.notes
      FROM appointments a
      LEFT JOIN user_credentials uc ON uc.id = a.user_id
      JOIN services s ON s.id = a.service_id
      JOIN user_credentials adv ON adv.id = a.advisor_user_id
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `);
    return result.recordset;
  }

  async findById(id) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('appointment_code', sql.VarChar(20), String(id))
      .query(`
        SELECT TOP 1
          a.appointment_code AS id,
          uc.user_code AS userId,
          a.student_name AS studentName,
          a.student_id AS studentId,
          s.service_code AS serviceId,
          a.service_name_snapshot AS serviceName,
          adv.user_code AS advisorId,
          a.advisor_name_snapshot AS advisor,
          a.appointment_date AS appointmentDate,
          a.appointment_time AS appointmentTime,
          a.status,
          a.queue_position AS queuePosition,
          a.notes
        FROM appointments a
        LEFT JOIN user_credentials uc ON uc.id = a.user_id
        JOIN services s ON s.id = a.service_id
        JOIN user_credentials adv ON adv.id = a.advisor_user_id
        WHERE a.appointment_code = @appointment_code
      `);
    return result.recordset[0] || null;
  }

  async findByStudentId(studentId) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('student_id', sql.VarChar(20), String(studentId))
      .query(`
        SELECT
          a.appointment_code AS id,
          uc.user_code AS userId,
          a.student_name AS studentName,
          a.student_id AS studentId,
          s.service_code AS serviceId,
          a.service_name_snapshot AS serviceName,
          adv.user_code AS advisorId,
          a.advisor_name_snapshot AS advisor,
          a.appointment_date AS appointmentDate,
          a.appointment_time AS appointmentTime,
          a.status,
          a.queue_position AS queuePosition,
          a.notes
        FROM appointments a
        LEFT JOIN user_credentials uc ON uc.id = a.user_id
        JOIN services s ON s.id = a.service_id
        JOIN user_credentials adv ON adv.id = a.advisor_user_id
        WHERE a.student_id = @student_id
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
      `);
    return result.recordset;
  }

  async create(appointment) {
    const pool = await getPool();
    const provided = appointment.id || appointment.appointmentCode || null;
    const code = provided && String(provided).length <= 20 ? String(provided) : appointmentCode();

    await pool
      .request()
      .input('appointment_code', sql.VarChar(20), code)
      .input('user_code', sql.VarChar(20), appointment.userId ? String(appointment.userId) : null)
      .input('student_id', sql.VarChar(20), String(appointment.studentId))
      .input('student_name', sql.VarChar(100), String(appointment.studentName))
      .input('service_code', sql.VarChar(20), String(appointment.serviceId))
      .input('service_name_snapshot', sql.VarChar(100), String(appointment.serviceName))
      .input('advisor_code', sql.VarChar(20), String(appointment.advisorId))
      .input('advisor_name_snapshot', sql.VarChar(100), String(appointment.advisor))
      .input('appointment_date', sql.Date, appointment.appointmentDate)
      .input('appointment_time', sql.Time, appointment.appointmentTime)
      .input('status', sql.VarChar(20), appointment.status || 'Scheduled')
      .input('queue_position', sql.Int, appointment.queuePosition ?? null)
      .input('notes', sql.VarChar(500), appointment.notes || null)
      .query(`
        INSERT INTO appointments (
          appointment_code,
          user_id,
          student_id,
          student_name,
          service_id,
          service_name_snapshot,
          advisor_user_id,
          advisor_name_snapshot,
          appointment_date,
          appointment_time,
          status,
          queue_position,
          notes
        )
        VALUES (
          @appointment_code,
          CASE WHEN @user_code IS NULL THEN NULL
               ELSE (SELECT TOP 1 id FROM user_credentials WHERE user_code = @user_code) END,
          @student_id,
          @student_name,
          (SELECT TOP 1 id FROM services WHERE service_code = @service_code),
          @service_name_snapshot,
          (SELECT TOP 1 id FROM user_credentials WHERE user_code = @advisor_code),
          @advisor_name_snapshot,
          @appointment_date,
          @appointment_time,
          @status,
          @queue_position,
          @notes
        )
      `);

    return this.findById(code);
  }
}

module.exports = new AppointmentRepository();
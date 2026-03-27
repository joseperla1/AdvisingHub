const appointmentService = require('../services/appointmentService');

async function createAppointment(req, res, next) {
  try {
    const appointment = await appointmentService.createAppointment(req.body);

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully.',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
}

async function getAppointmentsForStudent(req, res, next) {
  try {
    const appointments = await appointmentService.getAppointmentsForStudent(req.query.studentId);

    res.status(200).json({
      success: true,
      data: appointments
    });
  } catch (error) {
    next(error);
  }
}

async function getAdminAppointments(req, res, next) {
  try {
    const appointments = await appointmentService.getAdminAppointments();

    res.status(200).json({
      success: true,
      data: appointments
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createAppointment,
  getAppointmentsForStudent,
  getAdminAppointments
};
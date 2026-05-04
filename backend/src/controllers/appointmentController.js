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

async function updateAppointmentForStudent(req, res, next) {
  try {
    const appointment = await appointmentService.updateAppointmentForStudent(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Appointment updated successfully.',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}

async function cancelAppointmentForStudent(req, res, next) {
  try {
    const appointment = await appointmentService.cancelAppointmentForStudent(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Appointment canceled successfully.',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createAppointment,
  getAppointmentsForStudent,
  getAdminAppointments,
  updateAppointmentForStudent,
  cancelAppointmentForStudent,
};
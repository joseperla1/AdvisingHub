const appointmentRepository = require('../repositories/appointmentRepository');
const serviceRepository = require('../repositories/serviceRepository');
const { validateCreateAppointmentPayload } = require('../validators/appointmentValidators');
const { httpError } = require('../utils/httpError');

class AppointmentService {
  async getAppointmentsForStudent(studentId) {
    if (!studentId) {
      throw httpError(400, 'studentId is required.');
    }

    return appointmentRepository.findByStudentId(studentId);
  }

  async getAdminAppointments() {
    return appointmentRepository.findAll();
  }

  async createAppointment(payload) {
    const errors = validateCreateAppointmentPayload(payload);
    if (errors.length > 0) {
      throw httpError(400, errors.join(' '));
    }

    const service = await serviceRepository.findById(payload.serviceId);
    if (!service) {
      throw httpError(404, 'Selected service not found.');
    }

    const appointment = {
      id: `apt_${Date.now()}`,
      studentName: payload.studentName.trim(),
      studentId: payload.studentId.trim(),
      serviceId: service.id,
      serviceName: service.name,
      appointmentDate: payload.appointmentDate,
      appointmentTime: payload.appointmentTime,
      advisor: 'Advisor Smith',
      status: 'Scheduled',
      queuePosition: null,
      notes: payload.notes?.trim() || undefined
    };

    return appointmentRepository.create(appointment);
  }
}

module.exports = new AppointmentService();
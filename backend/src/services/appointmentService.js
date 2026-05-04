const appointmentRepository = require('../repositories/appointmentRepository');
const serviceRepository = require('../repositories/serviceRepository');
const userService = require('./user.service');
const {
  validateCreateAppointmentPayload,
  validateUpdateAppointmentPayload,
  validateCancelAppointmentPayload,
} = require('../validators/appointmentValidators');
const { httpError } = require('../utils/httpError');

function parseLocalDateTime(dateStr, timeStr) {
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || '').trim());
  const timeParts = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(timeStr || '').trim());
  if (!dateParts || !timeParts) return null;

  const year = Number(dateParts[1]);
  const month = Number(dateParts[2]) - 1;
  const day = Number(dateParts[3]);
  const hour = Number(timeParts[1]);
  const minute = Number(timeParts[2]);
  const second = timeParts[3] != null ? Number(timeParts[3]) : 0;
  const parsed = new Date(year, month, day, hour, minute, second, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function ensureNotPast(appointmentDate, appointmentTime) {
  const appointmentDateTime = parseLocalDateTime(appointmentDate, appointmentTime);
  if (!appointmentDateTime) {
    throw httpError(400, 'Invalid appointment date or time.');
  }
  if (appointmentDateTime.getTime() < Date.now()) {
    throw httpError(400, 'Appointments cannot be scheduled in the past.');
  }
}

class AppointmentService {
  async getAppointmentsForStudent(studentId) {
    if (!studentId) {
      throw httpError(400, 'studentId is required.');
    }

    return appointmentRepository.findByStudentId(studentId);
  }

  async getAdminAppointments() {
    return appointmentRepository.findByStatuses(['Scheduled', 'Waiting']);
  }

  async createAppointment(payload) {
    const errors = validateCreateAppointmentPayload(payload);
    if (errors.length > 0) {
      throw httpError(400, errors.join(' '));
    }
    ensureNotPast(payload.appointmentDate, payload.appointmentTime);

    const service = await serviceRepository.findById(payload.serviceId);
    if (!service) {
      throw httpError(404, 'Selected service not found.');
    }

    const advisor = await userService.getDefaultAdvisor();
    const appointment = {
      userId: payload.userId?.trim() || undefined,
      studentName: payload.studentName.trim(),
      studentId: payload.studentId.trim(),
      serviceId: service.id,
      serviceName: service.name,
      appointmentDate: payload.appointmentDate,
      appointmentTime: payload.appointmentTime,
      advisorId: advisor?.id || 'adm1',
      advisor: advisor?.name || 'Admin Smith',
      status: 'Scheduled',
      queuePosition: null,
      notes: payload.notes?.trim() || undefined,
    };

    return appointmentRepository.create(appointment);
  }

  async updateAppointmentForStudent(appointmentId, payload) {
    const errors = validateUpdateAppointmentPayload(payload);
    if (errors.length > 0) {
      throw httpError(400, errors.join(' '));
    }
    ensureNotPast(payload.appointmentDate, payload.appointmentTime);

    const existing = await appointmentRepository.findById(appointmentId);
    if (!existing || String(existing.studentId) !== String(payload.studentId).trim()) {
      throw httpError(404, 'Appointment not found for this student.');
    }
    if (!['Scheduled', 'Checked In'].includes(existing.status)) {
      throw httpError(400, 'Only scheduled or checked-in appointments can be edited.');
    }

    const service = await serviceRepository.findById(payload.serviceId);
    if (!service) {
      throw httpError(404, 'Selected service not found.');
    }

    const updated = await appointmentRepository.updateForStudent(appointmentId, payload.studentId.trim(), {
      serviceId: service.id,
      serviceName: service.name,
      appointmentDate: payload.appointmentDate,
      appointmentTime: payload.appointmentTime,
      notes: payload.notes?.trim() || undefined,
    });

    if (!updated || String(updated.studentId) !== String(payload.studentId).trim()) {
      throw httpError(404, 'Appointment not found for this student.');
    }

    return updated;
  }

  async cancelAppointmentForStudent(appointmentId, payload) {
    const errors = validateCancelAppointmentPayload(payload);
    if (errors.length > 0) {
      throw httpError(400, errors.join(' '));
    }

    const existing = await appointmentRepository.findById(appointmentId);
    if (!existing || String(existing.studentId) !== String(payload.studentId).trim()) {
      throw httpError(404, 'Appointment not found for this student.');
    }
    if (!['Scheduled', 'Checked In'].includes(existing.status)) {
      throw httpError(400, 'Only scheduled or checked-in appointments can be canceled.');
    }

    const canceled = await appointmentRepository.cancelForStudent(appointmentId, payload.studentId.trim());
    if (!canceled || String(canceled.studentId) !== String(payload.studentId).trim()) {
      throw httpError(404, 'Appointment not found for this student.');
    }
    return canceled;
  }
}

module.exports = new AppointmentService();
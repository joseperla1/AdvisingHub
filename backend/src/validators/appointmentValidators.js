function validateCreateAppointmentPayload(body) {
  const errors = [];

  if (!body.studentName || typeof body.studentName !== 'string' || body.studentName.trim().length === 0) {
    errors.push('studentName is required.');
  } else if (body.studentName.length > 100) {
    errors.push('studentName must not exceed 100 characters.');
  }

  if (!body.studentId || typeof body.studentId !== 'string') {
    errors.push('studentId is required.');
  }

  if (!body.serviceId || typeof body.serviceId !== 'string') {
    errors.push('serviceId is required.');
  }

  if (!body.appointmentDate || typeof body.appointmentDate !== 'string') {
    errors.push('appointmentDate is required.');
  }

  if (!body.appointmentTime || typeof body.appointmentTime !== 'string') {
    errors.push('appointmentTime is required.');
  }

  if (body.notes !== undefined && typeof body.notes !== 'string') {
    errors.push('notes must be a string.');
  }

  return errors;
}

module.exports = {
  validateCreateAppointmentPayload
};
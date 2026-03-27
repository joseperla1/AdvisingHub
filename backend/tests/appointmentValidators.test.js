
const { validateCreateAppointmentPayload } = require('../src/validators/appointmentValidators');

describe('Appointment Validators', () => {
  test('returns no errors for valid payload', () => {
    const errors = validateCreateAppointmentPayload({
      studentName: 'Jose Student',
      studentId: 'STU777',
      serviceId: 'svc1',
      appointmentDate: '2026-03-28',
      appointmentTime: '14:30',
      notes: 'Bring forms'
    });

    expect(errors).toEqual([]);
  });

  test('requires studentName', () => {
    const errors = validateCreateAppointmentPayload({
      studentId: 'STU777',
      serviceId: 'svc1',
      appointmentDate: '2026-03-28',
      appointmentTime: '14:30'
    });

    expect(errors).toContain('studentName is required.');
  });

  test('rejects studentName over 100 characters', () => {
    const errors = validateCreateAppointmentPayload({
      studentName: 'a'.repeat(101),
      studentId: 'STU777',
      serviceId: 'svc1',
      appointmentDate: '2026-03-28',
      appointmentTime: '14:30'
    });

    expect(errors).toContain('studentName must not exceed 100 characters.');
  });

  test('requires studentId', () => {
    const errors = validateCreateAppointmentPayload({
      studentName: 'Jose Student',
      serviceId: 'svc1',
      appointmentDate: '2026-03-28',
      appointmentTime: '14:30'
    });

    expect(errors).toContain('studentId is required.');
  });

  test('requires serviceId', () => {
    const errors = validateCreateAppointmentPayload({
      studentName: 'Jose Student',
      studentId: 'STU777',
      appointmentDate: '2026-03-28',
      appointmentTime: '14:30'
    });

    expect(errors).toContain('serviceId is required.');
  });

  test('requires appointmentDate', () => {
    const errors = validateCreateAppointmentPayload({
      studentName: 'Jose Student',
      studentId: 'STU777',
      serviceId: 'svc1',
      appointmentTime: '14:30'
    });

    expect(errors).toContain('appointmentDate is required.');
  });

  test('requires appointmentTime', () => {
    const errors = validateCreateAppointmentPayload({
      studentName: 'Jose Student',
      studentId: 'STU777',
      serviceId: 'svc1',
      appointmentDate: '2026-03-28'
    });

    expect(errors).toContain('appointmentTime is required.');
  });

  test('rejects notes when not a string', () => {
    const errors = validateCreateAppointmentPayload({
      studentName: 'Jose Student',
      studentId: 'STU777',
      serviceId: 'svc1',
      appointmentDate: '2026-03-28',
      appointmentTime: '14:30',
      notes: 123
    });

    expect(errors).toContain('notes must be a string.');
  });
});
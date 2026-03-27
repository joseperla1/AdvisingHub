const appointmentService = require('../src/services/appointmentService');
const { appointments } = require('../src/data/appointmentsStore');
const { services } = require('../src/data/servicesStores');

describe('Appointment Service', () => {
  beforeEach(() => {
    appointments.length = 0;
    services.length = 0;

    services.push(
      {
        id: 'svc1',
        name: 'Transcript Request',
        description: 'Official and unofficial transcript processing.',
        expectedDurationMin: 10,
        priority: 'normal'
      },
      {
        id: 'svc2',
        name: 'Graduation Check',
        description: 'Degree audit and graduation readiness review.',
        expectedDurationMin: 20,
        priority: 'high'
      }
    );

    appointments.push(
      {
        id: 'apt1',
        studentName: 'Ariana M.',
        studentId: 'STU002',
        serviceId: 'svc1',
        serviceName: 'Transcript Request',
        appointmentDate: '2026-03-28',
        appointmentTime: '14:30',
        advisor: 'Advisor Smith',
        status: 'Scheduled',
        queuePosition: null
      }
    );
  });

  test('getAppointmentsForStudent returns student appointments', async () => {
    const result = await appointmentService.getAppointmentsForStudent('STU002');

    expect(result.length).toBe(1);
    expect(result[0].studentName).toBe('Ariana M.');
  });

  test('getAppointmentsForStudent requires studentId', async () => {
    await expect(appointmentService.getAppointmentsForStudent()).rejects.toThrow(
      'studentId is required.'
    );
  });

  test('getAdminAppointments returns all appointments', async () => {
    const result = await appointmentService.getAdminAppointments();

    expect(result.length).toBe(1);
  });

  test('createAppointment creates appointment for valid payload', async () => {
    const created = await appointmentService.createAppointment({
      studentName: 'Jose Student',
      studentId: 'STU777',
      serviceId: 'svc2',
      appointmentDate: '2026-03-30',
      appointmentTime: '10:00',
      notes: 'Check degree plan'
    });

    expect(created.studentName).toBe('Jose Student');
    expect(created.serviceName).toBe('Graduation Check');
    expect(created.status).toBe('Scheduled');
    expect(appointments.length).toBe(2);
  });

  test('createAppointment rejects invalid payload', async () => {
    await expect(
      appointmentService.createAppointment({
        studentName: '',
        studentId: '',
        serviceId: '',
        appointmentDate: '',
        appointmentTime: ''
      })
    ).rejects.toThrow();
  });

  test('createAppointment rejects unknown service', async () => {
    await expect(
      appointmentService.createAppointment({
        studentName: 'Jose Student',
        studentId: 'STU777',
        serviceId: 'missing-service',
        appointmentDate: '2026-03-30',
        appointmentTime: '10:00'
      })
    ).rejects.toThrow('Selected service not found.');
  });
});
jest.mock('../src/repositories/appointmentRepository', () => ({
  findByStudentId: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../src/repositories/serviceRepository', () => ({
  findById: jest.fn(),
}));

jest.mock('../src/services/user.service', () => ({
  getDefaultAdvisor: jest.fn(),
}));

const appointmentRepository = require('../src/repositories/appointmentRepository');
const serviceRepository = require('../src/repositories/serviceRepository');
const userService = require('../src/services/user.service');
const appointmentService = require('../src/services/appointmentService');

describe('Appointment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appointmentRepository.findByStudentId.mockResolvedValue([
      {
        id: 'apt1',
        studentName: 'Ariana M.',
        studentId: '20260002',
        serviceId: 'svc1',
        serviceName: 'Transcript Request',
        appointmentDate: '2026-03-28',
        appointmentTime: '14:30',
        advisor: 'Admin Smith',
        status: 'Scheduled',
        queuePosition: null,
      },
    ]);
    appointmentRepository.findAll.mockResolvedValue([]);
    userService.getDefaultAdvisor.mockResolvedValue({ id: 'adm1', name: 'Admin Smith' });
  });

  test('getAppointmentsForStudent returns student appointments', async () => {
    const result = await appointmentService.getAppointmentsForStudent('20260002');

    expect(result.length).toBe(1);
    expect(result[0].studentName).toBe('Ariana M.');
  });

  test('getAppointmentsForStudent requires studentId', async () => {
    await expect(appointmentService.getAppointmentsForStudent()).rejects.toThrow(
      'studentId is required.'
    );
  });

  test('getAdminAppointments returns all appointments', async () => {
    appointmentRepository.findAll.mockResolvedValue([{ id: 'apt1' }]);
    const result = await appointmentService.getAdminAppointments();

    expect(result.length).toBe(1);
  });

  test('createAppointment creates appointment for valid payload', async () => {
    serviceRepository.findById.mockResolvedValue({ id: 'svc2', name: 'Graduation Check' });
    appointmentRepository.create.mockImplementation(async (appt) => appt);
    const created = await appointmentService.createAppointment({
      studentName: 'Jose Student',
      studentId: '20260777',
      serviceId: 'svc2',
      appointmentDate: '2026-03-30',
      appointmentTime: '10:00',
      notes: 'Check degree plan'
    });

    expect(created.studentName).toBe('Jose Student');
    expect(created.serviceName).toBe('Graduation Check');
    expect(created.status).toBe('Scheduled');
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
    serviceRepository.findById.mockResolvedValue(null);
    await expect(
      appointmentService.createAppointment({
        studentName: 'Jose Student',
        studentId: '20260777',
        serviceId: 'missing-service',
        appointmentDate: '2026-03-30',
        appointmentTime: '10:00'
      })
    ).rejects.toThrow('Selected service not found.');
  });
});
jest.mock('../src/repositories/appointmentRepository', () => ({
  findByStudentId: jest.fn(),
  findByStatuses: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateForStudent: jest.fn(),
  cancelForStudent: jest.fn(),
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
  const futureDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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
    appointmentRepository.findByStatuses.mockResolvedValue([]);
    appointmentRepository.findById.mockResolvedValue({
      id: 'apt-existing',
      studentId: '20260777',
      status: 'Scheduled',
    });
    appointmentRepository.updateForStudent.mockResolvedValue({
      id: 'apt-existing',
      studentId: '20260777',
      status: 'Scheduled',
    });
    appointmentRepository.cancelForStudent.mockResolvedValue({
      id: 'apt-existing',
      studentId: '20260777',
      status: 'Canceled',
    });
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

  test('getAdminAppointments returns scheduled/waiting appointments', async () => {
    appointmentRepository.findByStatuses.mockResolvedValue([{ id: 'apt1' }]);
    const result = await appointmentService.getAdminAppointments();

    expect(result.length).toBe(1);
    expect(appointmentRepository.findByStatuses).toHaveBeenCalledWith(['Scheduled', 'Waiting']);
  });

  test('createAppointment creates appointment for valid payload', async () => {
    serviceRepository.findById.mockResolvedValue({ id: 'svc2', name: 'Graduation Check' });
    appointmentRepository.create.mockImplementation(async (appt) => appt);
    const created = await appointmentService.createAppointment({
      studentName: 'Jose Student',
      studentId: '20260777',
      serviceId: 'svc2',
      appointmentDate: futureDate(),
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
        appointmentDate: futureDate(),
        appointmentTime: '10:00'
      })
    ).rejects.toThrow('Selected service not found.');
  });

  test('createAppointment rejects appointments in the past', async () => {
    await expect(
      appointmentService.createAppointment({
        studentName: 'Jose Student',
        studentId: '20260777',
        serviceId: 'svc2',
        appointmentDate: '2000-01-01',
        appointmentTime: '10:00',
      })
    ).rejects.toThrow('Appointments cannot be scheduled in the past.');
  });

  test('updateAppointmentForStudent updates when allowed', async () => {
    serviceRepository.findById.mockResolvedValue({ id: 'svc2', name: 'Graduation Check' });

    const updated = await appointmentService.updateAppointmentForStudent('apt-existing', {
      studentId: '20260777',
      serviceId: 'svc2',
      appointmentDate: futureDate(),
      appointmentTime: '13:15',
      notes: 'Updated notes',
    });

    expect(updated.id).toBe('apt-existing');
    expect(appointmentRepository.updateForStudent).toHaveBeenCalled();
  });

  test('cancelAppointmentForStudent cancels when allowed', async () => {
    const canceled = await appointmentService.cancelAppointmentForStudent('apt-existing', {
      studentId: '20260777',
    });
    expect(canceled.status).toBe('Canceled');
    expect(appointmentRepository.cancelForStudent).toHaveBeenCalledWith('apt-existing', '20260777');
  });
});
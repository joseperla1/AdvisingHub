const request = require('supertest');
const app = require('../src/app');
jest.mock('../src/services/appointmentService', () => ({
  createAppointment: jest.fn(),
  getAppointmentsForStudent: jest.fn(),
  getAdminAppointments: jest.fn(),
}));
const appointmentService = require('../src/services/appointmentService');

describe('Appointment Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/appointments creates appointment', async () => {
    appointmentService.createAppointment.mockResolvedValue({ id: 'apt1', status: 'Scheduled' });
    const response = await request(app)
      .post('/api/appointments')
      .send({
        studentName: 'Jose Student',
        studentId: 'STU777',
        serviceId: 'svc1',
        appointmentDate: '2026-03-30',
        appointmentTime: '10:00',
        notes: 'Need transcript urgently'
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('Scheduled');
  });

  test('POST /api/appointments returns 400 for invalid payload', async () => {
    appointmentService.createAppointment.mockRejectedValue(Object.assign(new Error('invalid'), { statusCode: 400 }));
    const response = await request(app)
      .post('/api/appointments')
      .send({
        studentName: '',
        studentId: '',
        serviceId: '',
        appointmentDate: '',
        appointmentTime: ''
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test('GET /api/appointments returns appointments for studentId query', async () => {
    appointmentService.getAppointmentsForStudent.mockResolvedValue([{ id: 'apt1' }]);
    const response = await request(app)
      .get('/api/appointments')
      .query({ studentId: 'STU002' });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBe(1);
  });

  test('GET /api/admin/appointments returns all appointments', async () => {
    appointmentService.getAdminAppointments.mockResolvedValue([{ id: 'apt1' }]);
    const response = await request(app).get('/api/admin/appointments');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBe(1);
  });
});
const request = require('supertest');
const app = require('../src/app');
const { appointments } = require('../src/data/appointmentsStore');
const { services } = require('../src/data/servicesStores');

describe('Appointment Routes', () => {
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

  test('POST /api/appointments creates appointment', async () => {
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
    const response = await request(app)
      .get('/api/appointments')
      .query({ studentId: 'STU002' });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBe(1);
  });

  test('GET /api/admin/appointments returns all appointments', async () => {
    const response = await request(app).get('/api/admin/appointments');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBe(1);
  });
});
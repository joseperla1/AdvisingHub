const request = require('supertest');
const app = require('../src/app');
const { queueItems } = require('../src/data/queueStore');

describe('Queue User Routes', () => {
  beforeEach(() => {
    queueItems.length = 0;
  });

  test('POST /api/queue/join creates queue item', async () => {
    const response = await request(app)
      .post('/api/queue/join')
      .send({
        userId: 'u200',
        name: 'Maya Lopez',
        studentId: 'STU200',
        serviceId: 'svc4',
        serviceName: 'General Advising',
        priority: 'normal'
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('waiting');
  });

  test('POST /api/queue/join returns 400 for invalid payload', async () => {
    const response = await request(app)
      .post('/api/queue/join')
      .send({
        userId: '',
        name: '',
        studentId: '',
        serviceId: '',
        serviceName: ''
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test('POST /api/queue/:queueId/leave marks waiting user as left', async () => {
    queueItems.push({
      id: 'q1',
      userId: 'u101',
      name: 'John Smith',
      studentId: 'STU001',
      serviceId: 'svc1',
      serviceName: 'Transcript Request',
      priority: 'normal',
      status: 'waiting',
      joinedAt: '2026-03-24T18:00:00.000Z'
    });

    const response = await request(app).post('/api/queue/q1/leave');

    expect(response.statusCode).toBe(200);
    expect(response.body.data.status).toBe('left');
  });

  test('POST /api/queue/:queueId/leave returns 404 if queue item missing', async () => {
    const response = await request(app).post('/api/queue/missing/leave');

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
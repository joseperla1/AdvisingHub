const request = require('supertest');
const app = require('../src/app');
const { queueItems } = require('../src/data/queueStore');

describe('Admin Queue Routes', () => {
  beforeEach(() => {
    queueItems.length = 0;

    queueItems.push(
      {
        id: 'q1',
        userId: 'u101',
        name: 'Student A',
        studentId: 'STU001',
        serviceId: 'svc1',
        serviceName: 'Transcript Request',
        priority: 'normal',
        status: 'waiting',
        joinedAt: '2026-03-24T18:00:00.000Z'
      },
      {
        id: 'q2',
        userId: 'u102',
        name: 'Student B',
        studentId: 'STU002',
        serviceId: 'svc2',
        serviceName: 'Add/Drop',
        priority: 'high',
        status: 'waiting',
        joinedAt: '2026-03-24T18:05:00.000Z'
      }
    );
  });

  test('GET /api/admin/queue should return current queue', async () => {
    const response = await request(app).get('/api/admin/queue');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('POST /api/admin/queue/serve-next should serve next user', async () => {
    const response = await request(app).post('/api/admin/queue/serve-next');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('serving');
  });
});
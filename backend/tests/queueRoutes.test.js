const request = require('supertest');
const app = require('../src/app');
jest.mock('../src/services/queueService', () => ({
  joinQueue: jest.fn(),
  leaveQueue: jest.fn(),
  getActiveQueueEntryForUser: jest.fn(),
}));
const queueService = require('../src/services/queueService');

describe('Queue User Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/queue/join creates queue item', async () => {
    queueService.joinQueue.mockResolvedValue({
      queueItem: { id: 'qe1', status: 'waiting' },
      position: 1,
      estimatedWaitMin: 10,
      notification: { id: 'evt1' },
    });
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
    expect(response.body.data.queueItem.status).toBe('waiting');
  });

  test('POST /api/queue/join returns 400 for invalid payload', async () => {
    queueService.joinQueue.mockRejectedValue(Object.assign(new Error('bad payload'), { statusCode: 400 }));
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
    queueService.leaveQueue.mockResolvedValue({ id: 'qe1', status: 'left' });

    const response = await request(app).post('/api/queue/q1/leave');

    expect(response.statusCode).toBe(200);
    expect(response.body.data.status).toBe('left');
  });

  test('POST /api/queue/:queueId/leave returns 404 if queue item missing', async () => {
    queueService.leaveQueue.mockRejectedValue(Object.assign(new Error('Queue item not found.'), { statusCode: 404 }));
    const response = await request(app).post('/api/queue/missing/leave');

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
const request = require('supertest');
const app = require('../src/app');

jest.mock('../src/repositories/notificationRepository', () => ({
  findByUserId: jest.fn(),
}));
const notificationRepository = require('../src/repositories/notificationRepository');

describe('Notifications Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/notifications/:userId returns notifications', async () => {
    notificationRepository.findByUserId.mockResolvedValue([
      { id: 'evt1', userId: 'usr1', queueId: 'qe1', type: 'serving', message: 'Now serving', createdAt: new Date().toISOString(), status: 'serving' },
    ]);
    const res = await request(app).get('/api/notifications/usr1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
  });
});


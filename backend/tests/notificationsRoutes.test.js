const request = require('supertest');
const app = require('../src/app');

jest.mock('../src/repositories/notificationRepository', () => ({
  findByUserId: jest.fn(),
  ensureTodayAppointmentReminders: jest.fn(),
  markReadForUser: jest.fn(),
  dismissForUser: jest.fn(),
  markAllReadForUser: jest.fn(),
}));
const notificationRepository = require('../src/repositories/notificationRepository');

describe('Notifications Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/notifications/:userId returns notifications', async () => {
    notificationRepository.ensureTodayAppointmentReminders.mockResolvedValue();
    notificationRepository.findByUserId.mockResolvedValue([
      { id: 'evt1', userId: 'usr1', queueId: 'qe1', type: 'serving', message: 'Now serving', createdAt: new Date().toISOString(), status: 'serving' },
    ]);
    const res = await request(app).get('/api/notifications/usr1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  test('POST /api/notifications/:userId/read-all marks all read', async () => {
    notificationRepository.markAllReadForUser.mockResolvedValue();
    const res = await request(app).post('/api/notifications/usr1/read-all');
    expect(res.status).toBe(200);
    expect(notificationRepository.markAllReadForUser).toHaveBeenCalledWith('usr1');
  });

  test('POST /api/notifications/:userId/:notificationId/dismiss dismisses notification', async () => {
    notificationRepository.dismissForUser.mockResolvedValue();
    const res = await request(app).post('/api/notifications/usr1/evt1/dismiss');
    expect(res.status).toBe(200);
    expect(notificationRepository.dismissForUser).toHaveBeenCalledWith('usr1', 'evt1');
  });

  test('POST /api/notifications/:userId/:notificationId/read marks notification read', async () => {
    notificationRepository.markReadForUser.mockResolvedValue();
    const res = await request(app).post('/api/notifications/usr1/evt9/read');
    expect(res.status).toBe(200);
    expect(notificationRepository.markReadForUser).toHaveBeenCalledWith('usr1', 'evt9');
  });
});


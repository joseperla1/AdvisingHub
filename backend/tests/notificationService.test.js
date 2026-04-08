jest.mock('../src/repositories/notificationRepository', () => ({
  create: jest.fn(async (n) => ({ ...n, id: 'evt1' })),
}));

const notificationRepo = require('../src/repositories/notificationRepository');
const notificationService = require('../src/services/notificationService');

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createNotification sends notification to repository', async () => {
    const notif = await notificationService.createNotification({
      userId: 'u1',
      queueId: 'q1',
      type: 'queue_joined',
      title: 'Joined',
      message: 'User joined queue',
      meta: { position: 1 }
    });
    expect(notif).toHaveProperty('id');
    expect(notif.userId).toBe('u1');
    expect(notificationRepo.create).toHaveBeenCalledTimes(1);
  });

  test('notifyQueueJoined creates correct notification', async () => {
    const user = { id: 'u2', name: 'Test User' };
    const queueItem = { id: 'q2', serviceName: 'Test Service' };
    const notif = await notificationService.notifyQueueJoined(user, queueItem, 2);
    expect(notif.type).toBe('queue_joined');
    expect(notif.meta.position).toBe(2);
    expect(notif.message).toContain('Test User');
    expect(notif.message).toContain('Test Service');
  });

  test('notifyAlmostReady creates correct notification', async () => {
    const user = { id: 'u3', name: 'Ready User' };
    const queueItem = { id: 'q3', serviceName: 'Service' };
    const notif = await notificationService.notifyAlmostReady(user, queueItem, 1);
    expect(notif.type).toBe('almost_ready');
    expect(notif.meta.position).toBe(1);
    expect(notif.message).toContain('Ready User');
  });

  test('notifyNowServing creates correct notification', async () => {
    const user = { id: 'u4', name: 'Serving User' };
    const queueItem = { id: 'q4', serviceName: 'Service X' };
    const notif = await notificationService.notifyNowServing(user, queueItem);
    expect(notif.type).toBe('serving');
    expect(notif.message).toContain('Serving User');
    expect(notif.message).toContain('Service X');
  });
});

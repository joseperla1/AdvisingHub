const notificationService = require('../src/services/notificationService');
const { notifications } = require('../src/data/notificationStore');

describe('Notification Service', () => {
  beforeEach(() => {
    notifications.length = 0;
  });

  test('createNotification logs and stores notification', () => {
    const notif = notificationService.createNotification({
      userId: 'u1',
      queueId: 'q1',
      type: 'queue_joined',
      title: 'Joined',
      message: 'User joined queue',
      meta: { position: 1 }
    });
    expect(notif).toHaveProperty('id');
    expect(notif.userId).toBe('u1');
    expect(notifications.length).toBe(1);
    expect(notifications[0]).toEqual(notif);
  });

  test('notifyQueueJoined creates correct notification', () => {
    const user = { id: 'u2', name: 'Test User' };
    const queueItem = { id: 'q2', serviceName: 'Test Service' };
    const notif = notificationService.notifyQueueJoined(user, queueItem, 2);
    expect(notif.type).toBe('queue_joined');
    expect(notif.meta.position).toBe(2);
    expect(notif.message).toContain('Test User');
    expect(notif.message).toContain('Test Service');
  });

  test('notifyAlmostReady creates correct notification', () => {
    const user = { id: 'u3', name: 'Ready User' };
    const queueItem = { id: 'q3', serviceName: 'Service' };
    const notif = notificationService.notifyAlmostReady(user, queueItem, 1);
    expect(notif.type).toBe('almost_ready');
    expect(notif.meta.position).toBe(1);
    expect(notif.message).toContain('Ready User');
  });
});

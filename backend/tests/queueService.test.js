const queueService = require('../src/services/queueService');
const { queueItems } = require('../src/data/queueStore');

describe('Queue Service', () => {
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

  test('should sort queue by priority first', async () => {
    const queue = await queueService.getCurrentQueue();
    expect(queue[0].studentId).toBe('STU002');
    expect(queue[1].studentId).toBe('STU001');
  });

  test('should serve next highest priority waiting user', async () => {
    const next = await queueService.serveNextUser();
    expect(next.studentId).toBe('STU002');
    expect(next.status).toBe('serving');
  });

  test('should throw if someone is already serving', async () => {
    queueItems[0].status = 'serving';

    await expect(queueService.serveNextUser()).rejects.toThrow(
      'A user is already being served.'
    );
  });

  test('should join queue successfully', async () => {
    const result = await queueService.joinQueue({
      userId: 'u103',
      name: 'Student C',
      studentId: 'STU003',
      serviceId: 'svc3',
      serviceName: 'Graduation Check',
      priority: 'medium'
    });

    expect(result.studentId).toBe('STU003');
    expect(result.status).toBe('waiting');
  });

  test('should reject invalid join payload', async () => {
    await expect(
      queueService.joinQueue({
        userId: '',
        name: '',
        studentId: '',
        serviceId: '',
        serviceName: ''
      })
    ).rejects.toThrow();
  });
});
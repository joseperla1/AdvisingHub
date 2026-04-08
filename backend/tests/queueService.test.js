jest.mock('../src/repositories/queueRepository', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByStudentId: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  findServing: jest.fn(),
  findNextWaiting: jest.fn(),
}));

jest.mock('../src/repositories/serviceRepository', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
}));

jest.mock('../src/services/notificationService', () => ({
  notifyQueueJoined: jest.fn(() => ({ id: 'evt1' })),
  notifyAlmostReady: jest.fn(() => ({ id: 'evt2' })),
  notifyNowServing: jest.fn(() => ({ id: 'evt3' })),
}));

jest.mock('../src/services/historyService', () => ({
  addHistoryEntry: jest.fn(async () => ({ id: 'evt_h1' })),
}));

jest.mock('../src/services/user.service', () => ({
  findUserById: jest.fn(async () => ({ id: 'usr1', name: 'Test User' })),
}));

const queueRepository = require('../src/repositories/queueRepository');
const serviceRepository = require('../src/repositories/serviceRepository');
const queueService = require('../src/services/queueService');

describe('Queue Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queueRepository.findAll.mockResolvedValue([
      {
        id: 'qe1',
        userId: 'usr1',
        name: 'John Smith',
        studentId: '20260001',
        serviceId: 'svc1',
        serviceName: 'Transcript Request',
        priority: 'normal',
        status: 'waiting',
        joinedAt: '2026-03-24T18:00:00.000Z',
      },
      {
        id: 'qe2',
        userId: 'usr2',
        name: 'Ariana M.',
        studentId: '20260002',
        serviceId: 'svc2',
        serviceName: 'Enrollment Verification',
        priority: 'normal',
        status: 'waiting',
        joinedAt: '2026-03-24T18:05:00.000Z',
      },
      {
        id: 'qe3',
        userId: 'usr3',
        name: 'Jordan S.',
        studentId: '20260003',
        serviceId: 'svc3',
        serviceName: 'Graduation Check',
        priority: 'high',
        status: 'waiting',
        joinedAt: '2026-03-24T18:10:00.000Z',
      },
    ]);
    serviceRepository.findAll.mockResolvedValue([
      { id: 'svc1', expectedDurationMin: 10 },
      { id: 'svc2', expectedDurationMin: 8 },
      { id: 'svc3', expectedDurationMin: 20 },
    ]);
    serviceRepository.findById.mockImplementation(async (id) => {
      const map = {
        svc1: { id: 'svc1', name: 'Transcript Request', expectedDurationMin: 10 },
        svc2: { id: 'svc2', name: 'Enrollment Verification', expectedDurationMin: 8 },
        svc3: { id: 'svc3', name: 'Graduation Check', expectedDurationMin: 20 },
      };
      return map[id] || null;
    });
  });

  test('getCurrentQueue sorts by priority first', async () => {
    const queue = await queueService.getCurrentQueue();

    expect(queue[0].studentId).toBe('20260003');
    expect(queue[1].studentId).toBe('20260001');
    expect(queue[2].studentId).toBe('20260002');
  });

  test('getCurrentQueue sorts by arrival time when priorities are the same', async () => {
    const all = await queueRepository.findAll();
    all[2].priority = 'normal';
    queueRepository.findAll.mockResolvedValue(all);

    const queue = await queueService.getCurrentQueue();

    expect(queue[0].studentId).toBe('20260001');
    expect(queue[1].studentId).toBe('20260002');
    expect(queue[2].studentId).toBe('20260003');
  });

  test('normal priority ranks ahead of low priority', async () => {
    const all = await queueRepository.findAll();
    all[2].priority = 'low';
    queueRepository.findAll.mockResolvedValue(all);

    const queue = await queueService.getCurrentQueue();

    expect(queue[0].studentId).toBe('20260001');
    expect(queue[1].studentId).toBe('20260002');
    expect(queue[2].studentId).toBe('20260003');
  });

  test('serveNextUser serves highest priority waiting user', async () => {
    queueRepository.findServing.mockResolvedValue(null);
    queueRepository.findNextWaiting.mockResolvedValue({
      id: 'qe3',
      userId: 'usr3',
      name: 'Jordan S.',
      studentId: '20260003',
      serviceId: 'svc3',
      serviceName: 'Graduation Check',
      priority: 'high',
      status: 'waiting',
      joinedAt: '2026-03-24T18:10:00.000Z',
    });
    queueRepository.updateById.mockResolvedValue({
      id: 'qe3',
      userId: 'usr3',
      name: 'Jordan S.',
      studentId: '20260003',
      serviceId: 'svc3',
      serviceName: 'Graduation Check',
      priority: 'high',
      status: 'serving',
      joinedAt: '2026-03-24T18:10:00.000Z',
    });

    const next = await queueService.serveNextUser();
    expect(next.studentId).toBe('20260003');
    expect(next.status).toBe('serving');
  });

  test('serveNextUser throws if someone is already serving', async () => {
    queueRepository.findServing.mockResolvedValue({ id: 'qe1', status: 'serving' });

    await expect(queueService.serveNextUser()).rejects.toThrow(
      'A user is already being served.'
    );
  });

  test('serveNextUser throws if no waiting users exist', async () => {
    queueRepository.findServing.mockResolvedValue(null);
    queueRepository.findNextWaiting.mockResolvedValue(null);

    await expect(queueService.serveNextUser()).rejects.toThrow(
      'No waiting users in the queue.'
    );
  });

  test('joinQueue adds a valid user to the queue', async () => {
    queueRepository.findByStudentId.mockResolvedValue(null);
    queueRepository.create.mockResolvedValue({
      id: 'qe4',
      userId: 'usr4',
      name: 'Maya Lopez',
      studentId: '20260004',
      serviceId: 'svc4',
      serviceName: 'General Advising',
      priority: 'medium',
      status: 'waiting',
      joinedAt: new Date().toISOString(),
    });
    serviceRepository.findById.mockResolvedValue({ id: 'svc4', name: 'General Advising', expectedDurationMin: 15 });

    const result = await queueService.joinQueue({
      userId: 'usr4',
      name: 'Maya Lopez',
      studentId: '20260004',
      serviceId: 'svc4',
      serviceName: 'General Advising',
      priority: 'medium',
    });

    expect(result.queueItem.studentId).toBe('20260004');
    expect(result.queueItem.status).toBe('waiting');
  });

  test('joinQueue rejects duplicate active student in queue', async () => {
    queueRepository.findByStudentId.mockResolvedValue({ id: 'qe1', status: 'waiting' });
    await expect(
      queueService.joinQueue({
        userId: 'usr999',
        name: 'John Smith Again',
        studentId: '20260001',
        serviceId: 'svc1',
        serviceName: 'Transcript Request',
        priority: 'normal'
      })
    ).rejects.toThrow('Student is already in the queue.');
  });

  test('leaveQueue marks waiting user as left', async () => {
    queueRepository.findById.mockResolvedValue({ id: 'qe1', status: 'waiting' });
    queueRepository.updateById.mockResolvedValue({ id: 'qe1', status: 'left' });
    const updated = await queueService.leaveQueue('qe1');
    expect(updated.status).toBe('left');
  });

  test('leaveQueue rejects non-waiting users', async () => {
    queueRepository.findById.mockResolvedValue({ id: 'qe1', status: 'serving' });

    await expect(queueService.leaveQueue('qe1')).rejects.toThrow(
      'Only waiting users can leave the queue.'
    );
  });

  test('completeServing marks serving user as served', async () => {
    queueRepository.findById.mockResolvedValue({ id: 'qe1', status: 'serving' });
    queueRepository.updateById.mockResolvedValue({ id: 'qe1', status: 'served' });
    const updated = await queueService.completeServing('qe1');
    expect(updated.status).toBe('served');
  });

  test('completeServing rejects non-serving users', async () => {
    queueRepository.findById.mockResolvedValue({ id: 'qe1', status: 'waiting' });
    await expect(queueService.completeServing('qe1')).rejects.toThrow(
      'Only a serving user can be completed.'
    );
  });

  test('markNoShow marks waiting user as no-show', async () => {
    queueRepository.findById.mockResolvedValue({ id: 'qe1', status: 'waiting' });
    queueRepository.updateById.mockResolvedValue({ id: 'qe1', status: 'no-show' });
    const updated = await queueService.markNoShow('qe1');
    expect(updated.status).toBe('no-show');
  });

  test('markNoShow marks serving user as no-show', async () => {
    queueRepository.findById.mockResolvedValue({ id: 'qe1', status: 'serving' });
    queueRepository.updateById.mockResolvedValue({ id: 'qe1', status: 'no-show' });
    const updated = await queueService.markNoShow('qe1');
    expect(updated.status).toBe('no-show');
  });

  test('markNoShow rejects served users', async () => {
    queueRepository.findById.mockResolvedValue({ id: 'qe1', status: 'served' });

    await expect(queueService.markNoShow('qe1')).rejects.toThrow(
      'Only waiting or serving users can be marked as no-show.'
    );
  });
});

// const queueService = require('../src/services/queueService');
// const { queueItems } = require('../src/data/queueStore');

// describe('Queue Service', () => {
//   beforeEach(() => {
//     queueItems.length = 0;

//     queueItems.push(
//       {
//         id: 'q1',
//         userId: 'u101',
//         name: 'Student A',
//         studentId: 'STU001',
//         serviceId: 'svc1',
//         serviceName: 'Transcript Request',
//         priority: 'normal',
//         status: 'waiting',
//         joinedAt: '2026-03-24T18:00:00.000Z'
//       },
//       {
//         id: 'q2',
//         userId: 'u102',
//         name: 'Student B',
//         studentId: 'STU002',
//         serviceId: 'svc2',
//         serviceName: 'Add/Drop',
//         priority: 'high',
//         status: 'waiting',
//         joinedAt: '2026-03-24T18:05:00.000Z'
//       }
//     );
//   });

//   test('should sort queue by priority first', async () => {
//     const queue = await queueService.getCurrentQueue();
//     expect(queue[0].studentId).toBe('STU002');
//     expect(queue[1].studentId).toBe('STU001');
//   });

//   test('should serve next highest priority waiting user', async () => {
//     const next = await queueService.serveNextUser();
//     expect(next.studentId).toBe('STU002');
//     expect(next.status).toBe('serving');
//   });

//   test('should throw if someone is already serving', async () => {
//     queueItems[0].status = 'serving';

//     await expect(queueService.serveNextUser()).rejects.toThrow(
//       'A user is already being served.'
//     );
//   });

//   test('should join queue successfully', async () => {
//     const result = await queueService.joinQueue({
//       userId: 'u103',
//       name: 'Student C',
//       studentId: 'STU003',
//       serviceId: 'svc3',
//       serviceName: 'Graduation Check',
//       priority: 'medium'
//     });

//     expect(result.studentId).toBe('STU003');
//     expect(result.status).toBe('waiting');
//   });

//   test('should reject invalid join payload', async () => {
//     await expect(
//       queueService.joinQueue({
//         userId: '',
//         name: '',
//         studentId: '',
//         serviceId: '',
//         serviceName: ''
//       })
//     ).rejects.toThrow();
//   });
// });
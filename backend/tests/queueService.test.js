const queueService = require('../src/services/queueService');
const { queueItems } = require('../src/data/queueStore');

describe('Queue Service', () => {
  beforeEach(() => {
    queueItems.length = 0;

    queueItems.push(
      {
        id: 'q1',
        userId: 'u101',
        name: 'John Smith',
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
        name: 'Ariana M.',
        studentId: 'STU002',
        serviceId: 'svc2',
        serviceName: 'Add/Drop',
        priority: 'normal',
        status: 'waiting',
        joinedAt: '2026-03-24T18:05:00.000Z'
      },
      {
        id: 'q3',
        userId: 'u103',
        name: 'Jordan S.',
        studentId: 'STU003',
        serviceId: 'svc3',
        serviceName: 'Graduation Check',
        priority: 'high',
        status: 'waiting',
        joinedAt: '2026-03-24T18:10:00.000Z'
      }
    );
  });

  test('getCurrentQueue sorts by priority first', async () => {
    const queue = await queueService.getCurrentQueue();

    expect(queue[0].studentId).toBe('STU003');
    expect(queue[1].studentId).toBe('STU001');
    expect(queue[2].studentId).toBe('STU002');
  });

  test('getCurrentQueue sorts by arrival time when priorities are the same', async () => {
    queueItems[2].priority = 'normal';

    const queue = await queueService.getCurrentQueue();

    expect(queue[0].studentId).toBe('STU001');
    expect(queue[1].studentId).toBe('STU002');
    expect(queue[2].studentId).toBe('STU003');
  });

  test('normal priority ranks ahead of low priority', async () => {
    queueItems[2].priority = 'low';

    const queue = await queueService.getCurrentQueue();

    expect(queue[0].studentId).toBe('STU001');
    expect(queue[1].studentId).toBe('STU002');
    expect(queue[2].studentId).toBe('STU003');
  });

  test('serveNextUser serves highest priority waiting user', async () => {
    const next = await queueService.serveNextUser();

    expect(next.studentId).toBe('STU003');
    expect(next.status).toBe('serving');
  });

  test('serveNextUser throws if someone is already serving', async () => {
    queueItems[0].status = 'serving';

    await expect(queueService.serveNextUser()).rejects.toThrow(
      'A user is already being served.'
    );
  });

  test('serveNextUser throws if no waiting users exist', async () => {
    queueItems.forEach(item => {
      item.status = 'served';
    });

    await expect(queueService.serveNextUser()).rejects.toThrow(
      'No waiting users in the queue.'
    );
  });

  test('joinQueue adds a valid user to the queue', async () => {
    const result = await queueService.joinQueue({
      userId: 'u104',
      name: 'Maya Lopez',
      studentId: 'STU004',
      serviceId: 'svc4',
      serviceName: 'General Advising',
      priority: 'medium'
    });

    expect(result.studentId).toBe('STU004');
    expect(result.status).toBe('waiting');
    expect(queueItems.length).toBe(4);
  });

  test('joinQueue rejects duplicate active student in queue', async () => {
    await expect(
      queueService.joinQueue({
        userId: 'u999',
        name: 'John Smith Again',
        studentId: 'STU001',
        serviceId: 'svc1',
        serviceName: 'Transcript Request',
        priority: 'normal'
      })
    ).rejects.toThrow('Student is already in the queue.');
  });

  test('leaveQueue marks waiting user as left', async () => {
    const updated = await queueService.leaveQueue('q1');

    expect(updated.status).toBe('left');
  });

  test('leaveQueue rejects non-waiting users', async () => {
    queueItems[0].status = 'serving';

    await expect(queueService.leaveQueue('q1')).rejects.toThrow(
      'Only waiting users can leave the queue.'
    );
  });

  test('completeServing marks serving user as served', async () => {
    queueItems[0].status = 'serving';

    const updated = await queueService.completeServing('q1');

    expect(updated.status).toBe('served');
  });

  test('completeServing rejects non-serving users', async () => {
    await expect(queueService.completeServing('q1')).rejects.toThrow(
      'Only a serving user can be completed.'
    );
  });

  test('markNoShow marks waiting user as no-show', async () => {
    const updated = await queueService.markNoShow('q1');

    expect(updated.status).toBe('no-show');
  });

  test('markNoShow marks serving user as no-show', async () => {
    queueItems[0].status = 'serving';

    const updated = await queueService.markNoShow('q1');

    expect(updated.status).toBe('no-show');
  });

  test('markNoShow rejects served users', async () => {
    queueItems[0].status = 'served';

    await expect(queueService.markNoShow('q1')).rejects.toThrow(
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
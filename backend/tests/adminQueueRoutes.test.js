const request = require('supertest');
const app = require('../src/app');
jest.mock('../src/services/queueService', () => ({
  getCurrentQueueWithEstimates: jest.fn(),
  serveNextUser: jest.fn(),
  completeServing: jest.fn(),
  markNoShow: jest.fn(),
}));
const queueService = require('../src/services/queueService');

describe('Admin Queue Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/admin/queue returns current queue', async () => {
    queueService.getCurrentQueueWithEstimates.mockResolvedValue([
      { id: 'qe2', studentId: 'STU002', estimatedWaitMin: 0 },
      { id: 'qe1', studentId: 'STU001', estimatedWaitMin: 10 },
    ]);
    const response = await request(app).get('/api/admin/queue');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data[0].studentId).toBe('STU002');
  });

  test('POST /api/admin/queue/serve-next serves next user', async () => {
    queueService.serveNextUser.mockResolvedValue({ id: 'qe2', status: 'serving', studentId: 'STU002' });
    const response = await request(app).post('/api/admin/queue/serve-next');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('serving');
    expect(response.body.data.studentId).toBe('STU002');
  });

  test('POST /api/admin/queue/serve-next returns 409 if already serving', async () => {
    queueService.serveNextUser.mockRejectedValue(Object.assign(new Error('A user is already being served.'), { statusCode: 409 }));

    const response = await request(app).post('/api/admin/queue/serve-next');

    expect(response.statusCode).toBe(409);
    expect(response.body.success).toBe(false);
  });

  test('POST /api/admin/queue/:queueId/complete completes serving user', async () => {
    queueService.completeServing.mockResolvedValue({ id: 'qe1', status: 'served' });

    const response = await request(app).post('/api/admin/queue/q1/complete');

    expect(response.statusCode).toBe(200);
    expect(response.body.data.status).toBe('served');
  });

  test('POST /api/admin/queue/:queueId/no-show marks user as no-show', async () => {
    queueService.markNoShow.mockResolvedValue({ id: 'qe1', status: 'no-show' });

    const response = await request(app).post('/api/admin/queue/q1/no-show');

    expect(response.statusCode).toBe(200);
    expect(response.body.data.status).toBe('no-show');
  });
});


// const request = require('supertest');
// const app = require('../src/app');
// const { queueItems } = require('../src/data/queueStore');

// describe('Admin Queue Routes', () => {
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

//   test('GET /api/admin/queue should return current queue', async () => {
//     const response = await request(app).get('/api/admin/queue');

//     expect(response.statusCode).toBe(200);
//     expect(response.body.success).toBe(true);
//     expect(Array.isArray(response.body.data)).toBe(true);
//   });

//   test('POST /api/admin/queue/serve-next should serve next user', async () => {
//     const response = await request(app).post('/api/admin/queue/serve-next');

//     expect(response.statusCode).toBe(200);
//     expect(response.body.success).toBe(true);
//     expect(response.body.data.status).toBe('serving');
//   });
// });
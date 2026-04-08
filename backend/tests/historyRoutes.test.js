const request = require('supertest');
const app = require('../src/app');

jest.mock('../src/services/historyService', () => ({
  getHistoryByUserId: jest.fn(),
}));
const historyService = require('../src/services/historyService');

describe('History Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/history/:userId returns ticket history', async () => {
    historyService.getHistoryByUserId.mockResolvedValue([
      { id: 'qe1', serviceName: 'Transcript Request', joinedAt: '2026-03-24T18:00:00.000Z', leftAt: null },
    ]);

    const res = await request(app).get('/api/history/usr1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data[0].id).toBe('qe1');
  });
});


const request = require('supertest');
const app = require('../src/app');

jest.mock('../src/services/adminAnalyticsService', () => ({
  getOverview: jest.fn(),
  getFilterOptions: jest.fn(),
  getReport: jest.fn(),
}));

const adminAnalyticsService = require('../src/services/adminAnalyticsService');

describe('Admin Analytics Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/admin/analytics/overview returns overview payload', async () => {
    adminAnalyticsService.getOverview.mockResolvedValue({
      kpis: { totalServed: 1, avgWaitTimeMin: 2, busiestService: 'X', appointmentsToday: 0 },
      charts: { dailyQueueVolumeTrend: [] },
    });

    const res = await request(app).get('/api/admin/analytics/overview?rangeType=ytd');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.kpis.totalServed).toBe(1);
    expect(adminAnalyticsService.getOverview).toHaveBeenCalledWith(
      expect.objectContaining({ rangeType: 'ytd' }),
    );
  });

  test('GET /api/admin/analytics/filters returns filter options', async () => {
    adminAnalyticsService.getFilterOptions.mockResolvedValue({ services: ['A'], reportTypes: [] });

    const res = await request(app).get('/api/admin/analytics/filters');

    expect(res.status).toBe(200);
    expect(res.body.data.services).toEqual(['A']);
  });

  test('POST /api/admin/analytics/report returns 400 when reportType missing', async () => {
    const res = await request(app).post('/api/admin/analytics/report').send({ filters: {} });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(adminAnalyticsService.getReport).not.toHaveBeenCalled();
  });

  test('POST /api/admin/analytics/report returns rows for valid reportType', async () => {
    adminAnalyticsService.getReport.mockResolvedValue([{ id: 1 }]);

    const res = await request(app)
      .post('/api/admin/analytics/report')
      .send({ reportType: 'daily_queue_usage', filters: { limit: 5 } });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: 1 }]);
    expect(adminAnalyticsService.getReport).toHaveBeenCalledWith('daily_queue_usage', { limit: 5 });
  });
});

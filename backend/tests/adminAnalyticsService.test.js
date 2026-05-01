jest.mock('../src/repositories/adminAnalyticsRepository', () => ({
  getOverview: jest.fn(),
  getReport: jest.fn(),
  getReportFilterOptions: jest.fn(),
}));

const adminAnalyticsRepository = require('../src/repositories/adminAnalyticsRepository');
const adminAnalyticsService = require('../src/services/adminAnalyticsService');

describe('AdminAnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getOverview delegates to repository', async () => {
    adminAnalyticsRepository.getOverview.mockResolvedValue({ kpis: {} });
    const out = await adminAnalyticsService.getOverview({ rangeType: 'month' });
    expect(out).toEqual({ kpis: {} });
    expect(adminAnalyticsRepository.getOverview).toHaveBeenCalledWith({ rangeType: 'month' });
  });

  test('getReport delegates to repository', async () => {
    adminAnalyticsRepository.getReport.mockResolvedValue([]);
    const out = await adminAnalyticsService.getReport('user_queue_participation', { a: 1 });
    expect(out).toEqual([]);
    expect(adminAnalyticsRepository.getReport).toHaveBeenCalledWith('user_queue_participation', { a: 1 });
  });

  test('getFilterOptions delegates to getReportFilterOptions', async () => {
    adminAnalyticsRepository.getReportFilterOptions.mockResolvedValue({ services: [] });
    const out = await adminAnalyticsService.getFilterOptions();
    expect(out).toEqual({ services: [] });
    expect(adminAnalyticsRepository.getReportFilterOptions).toHaveBeenCalled();
  });
});

const analyticsRepository = require('../repositories/adminAnalyticsRepository');

class AdminAnalyticsService {
  async getOverview(options) {
    return analyticsRepository.getOverview(options);
  }

  async getReport(reportType, filters) {
    return analyticsRepository.getReport(reportType, filters);
  }

  async getFilterOptions() {
    return analyticsRepository.getReportFilterOptions();
  }
}

module.exports = new AdminAnalyticsService();


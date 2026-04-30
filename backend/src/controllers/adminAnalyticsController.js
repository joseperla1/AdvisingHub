const analyticsService = require('../services/adminAnalyticsService');

async function getOverview(req, res, next) {
  try {
    const data = await analyticsService.getOverview({
      rangeType: req.query.rangeType,
      date: req.query.date,
      month: req.query.month,
      year: req.query.year,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getFilterOptions(req, res, next) {
  try {
    const data = await analyticsService.getFilterOptions();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function generateReport(req, res, next) {
  try {
    const reportType = req.body?.reportType;
    const filters = req.body?.filters || {};
    if (!reportType) {
      return res.status(400).json({
        success: false,
        error: 'reportType is required.',
      });
    }

    const rows = await analyticsService.getReport(String(reportType), filters);
    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOverview,
  getFilterOptions,
  generateReport,
};


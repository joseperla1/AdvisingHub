const express = require('express');
const {
  getOverview,
  getFilterOptions,
  generateReport,
} = require('../controllers/adminAnalyticsController');

const router = express.Router();

router.get('/overview', getOverview);
router.get('/filters', getFilterOptions);
router.post('/report', generateReport);

module.exports = router;


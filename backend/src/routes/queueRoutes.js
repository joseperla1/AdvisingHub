const express = require('express');
const {
  joinQueue,
  leaveQueue,
  getActiveQueueEntry,
  getSmartWaitEstimate,
} = require('../controllers/queueController');

const router = express.Router();

router.get('/estimate/:serviceId', getSmartWaitEstimate);
router.get('/active', getActiveQueueEntry);
router.post('/join', joinQueue);
router.post('/:queueId/leave', leaveQueue);

module.exports = router;
const express = require('express');
const {
  joinQueue,
  leaveQueue,
  getActiveQueueEntry,
} = require('../controllers/queueController');

const router = express.Router();

router.get('/active', getActiveQueueEntry);
router.post('/join', joinQueue);
router.post('/:queueId/leave', leaveQueue);

module.exports = router;
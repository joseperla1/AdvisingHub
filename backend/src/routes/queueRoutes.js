const express = require('express');
const {
  joinQueue,
  leaveQueue
} = require('../controllers/queueController');

const router = express.Router();

router.post('/join', joinQueue);
router.post('/:queueId/leave', leaveQueue);

module.exports = router;
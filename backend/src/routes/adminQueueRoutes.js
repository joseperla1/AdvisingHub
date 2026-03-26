const express = require('express');
const {
  getCurrentQueue,
  serveNextUser,
  completeServing,
  markNoShow
} = require('../controllers/adminQueueController');

const router = express.Router();

router.get('/', getCurrentQueue);
router.post('/serve-next', serveNextUser);
router.post('/:queueId/complete', completeServing);
router.post('/:queueId/no-show',markNoShow);

module.exports = router;
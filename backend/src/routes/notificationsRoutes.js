const express = require('express');
const {
  getForUser,
  markRead,
  dismiss,
  markAllRead,
} = require('../controllers/notificationsController');

const router = express.Router();

router.get('/:userId', getForUser);
router.post('/:userId/read-all', markAllRead);
router.post('/:userId/:notificationId/read', markRead);
router.post('/:userId/:notificationId/dismiss', dismiss);

module.exports = router;

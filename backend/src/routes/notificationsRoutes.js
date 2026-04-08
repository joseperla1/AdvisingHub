const express = require('express');
const { getForUser } = require('../controllers/notificationsController');

const router = express.Router();

router.get('/:userId', getForUser);

module.exports = router;

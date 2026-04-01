const express = require('express');
const { getUserHistory } = require('../controllers/historyController');

const router = express.Router();

router.get('/:userId', getUserHistory);

module.exports = router;
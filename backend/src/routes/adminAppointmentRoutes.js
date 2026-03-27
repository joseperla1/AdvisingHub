const express = require('express');
const { getAdminAppointments } = require('../controllers/appointmentController');

const router = express.Router();

router.get('/', getAdminAppointments);

module.exports = router;
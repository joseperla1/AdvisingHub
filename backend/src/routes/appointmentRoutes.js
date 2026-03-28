const express = require('express');
const {
  createAppointment,
  getAppointmentsForStudent,
  getAdminAppointments
} = require('../controllers/appointmentController');

const router = express.Router();

router.post('/', createAppointment);
router.get('/', getAppointmentsForStudent);
router.get('/admin/all', getAdminAppointments);

module.exports = router;
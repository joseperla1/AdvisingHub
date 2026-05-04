const express = require('express');
const {
  createAppointment,
  getAppointmentsForStudent,
  getAdminAppointments,
  updateAppointmentForStudent,
  cancelAppointmentForStudent,
} = require('../controllers/appointmentController');

const router = express.Router();

router.post('/', createAppointment);
router.get('/', getAppointmentsForStudent);
router.put('/:id', updateAppointmentForStudent);
router.post('/:id/cancel', cancelAppointmentForStudent);
router.get('/admin/all', getAdminAppointments);

module.exports = router;
// backend/src/routes/serviceCatalogRoute.js
const express = require('express');
const {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService
} = require('../controllers/serviceCatalogController');

const router = express.Router();

// Public endpoints
router.get('/', getServices);
router.get('/:id', getServiceById);

// Admin endpoints
router.post('/', createService);
router.put('/:id', updateService);
router.delete('/:id', deleteService);

module.exports = router;
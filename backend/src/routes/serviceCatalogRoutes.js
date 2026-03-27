const express = require('express');
const { getServices } = require('../controllers/serviceCatalogController');

const router = express.Router();

router.get('/', getServices);

module.exports = router;
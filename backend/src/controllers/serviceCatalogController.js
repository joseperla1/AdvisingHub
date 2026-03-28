const serviceCatalogService = require('../services/serviceCatalogService');

async function getServices(req, res, next) {
  try {
    const services = await serviceCatalogService.getAllServices();

    res.status(200).json({
      success: true,
      data: services
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getServices
};
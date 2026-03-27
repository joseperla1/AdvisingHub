const serviceRepository = require('../repositories/serviceRepository');

class ServiceCatalogService {
  async getAllServices() {
    return serviceRepository.findAll();
  }
}

module.exports = new ServiceCatalogService();
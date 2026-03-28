const { services } = require('../data/servicesStores');

class ServiceRepository {
  async findAll() {
    return [...services];
  }

  async findById(id) {
    return services.find(s => s.id === id) || null;
  }

  async create(service) {
    services.push(service);
    return service;
  }

  async update(id, updatedService) {
    const index = services.findIndex(s => s.id === id);
    if (index === -1) return null;

    services[index] = { ...services[index], ...updatedService };
    return services[index];
  }
}

module.exports = new ServiceRepository();
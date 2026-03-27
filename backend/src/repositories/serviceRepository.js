const { services } = require('../data/servicesStores');

class ServiceRepository {
  async findAll() {
    return [...services];
  }

  async findById(id) {
    return services.find(s => s.id === id) || null;
  }
}

module.exports = new ServiceRepository();
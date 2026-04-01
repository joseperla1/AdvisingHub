// backend/src/services/serviceCatalogService.js
const { services } = require('../data/servicesStores');

class ServiceRepository {
  constructor() {
    this.services = services;
    this.services.forEach(s => {
      if (!s.queue) s.queue = [];
    });
  }

  async findAll() {
    return [...this.services];
  }

  async findById(id) {
    return this.services.find(s => s.id === id) || null;
  }

  async create(serviceData) {
    const newService = {
      id: `svc${this.services.length + 1}`,
      name: serviceData.name,
      description: serviceData.description || '',
      expectedDuration: serviceData.expectedDuration ?? 15,
      priority: serviceData.priority || 'normal',
      queue: []
    };
    this.services.push(newService);
    return newService;
  }

  async update(id, updateData) {
    const service = await this.findById(id);
    if (!service) return null;

    Object.assign(service, {
      name: updateData.name ?? service.name,
      description: updateData.description ?? service.description,
      expectedDuration: updateData.expectedDuration ?? service.expectedDuration,
      priority: updateData.priority ?? service.priority
    });

    return service;
  }

  async removeService(id) {
    const index = this.services.findIndex(s => s.id === id);
    if (index === -1) return false;
    this.services.splice(index, 1);
    return true;
  }
}

module.exports = new ServiceRepository();
const serviceRepository = require('../repositories/serviceRepository');

class ServiceCatalogService {
  async findAll() {
    return serviceRepository.findAll();
  }

  async findById(id) {
    return serviceRepository.findById(id);
  }

  async create(serviceData) {
    const duration = serviceData.expectedDuration ?? serviceData.expectedDurationMin ?? 15;
    const prio = serviceData.priority || 'normal';
    return serviceRepository.create({
      name: serviceData.name,
      description: serviceData.description || '',
      expectedDurationMin: duration,
      priority: prio === 'medium' ? 'normal' : prio,
      isActive: true,
    });
  }

  async update(id, updateData) {
    const duration = updateData.expectedDuration ?? updateData.expectedDurationMin;
    const nextPrio = updateData.priority;
    return serviceRepository.update(id, {
      name: updateData.name,
      description: updateData.description,
      expectedDurationMin: duration,
      priority: nextPrio === 'medium' ? 'normal' : nextPrio,
    });
  }

  async removeService(id) {
    return serviceRepository.removeById(id);
  }
}

module.exports = new ServiceCatalogService();

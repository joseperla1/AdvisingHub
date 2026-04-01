const { services } = require('../data/servicesStores');

function ensureQueueArrays() {
  services.forEach(s => {
    if (!s.queue) s.queue = [];
  });
}

ensureQueueArrays();

class ServiceCatalogService {
  async findAll() {
    return [...services];
  }

  async findById(id) {
    return services.find(s => s.id === id) || null;
  }

  async create(serviceData) {
    const duration =
      serviceData.expectedDuration ??
      serviceData.expectedDurationMin ??
      15;
    const prio = serviceData.priority || 'normal';
    const newService = {
      id: `svc_${Date.now()}`,
      name: serviceData.name,
      description: serviceData.description || '',
      expectedDurationMin: duration,
      priority: prio === 'medium' ? 'normal' : prio,
      queue: [],
    };
    services.push(newService);
    return newService;
  }

  async update(id, updateData) {
    const service = await this.findById(id);
    if (!service) return null;

    const duration =
      updateData.expectedDuration ??
      updateData.expectedDurationMin ??
      service.expectedDurationMin;

    const nextPrio = updateData.priority ?? service.priority;
    Object.assign(service, {
      name: updateData.name ?? service.name,
      description: updateData.description ?? service.description,
      expectedDurationMin: duration,
      priority: nextPrio === 'medium' ? 'normal' : nextPrio,
    });

    return service;
  }

  async removeService(id) {
    const index = services.findIndex(s => s.id === id);
    if (index === -1) return false;
    services.splice(index, 1);
    return true;
  }
}

module.exports = new ServiceCatalogService();

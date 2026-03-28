const serviceCatalogService = require('../services/serviceCatalogService');

// GET /api/services
async function getServices(req, res, next) {
  try {
    const services = await serviceCatalogService.findAll();
    const mapped = services.map(s => ({
      ...s,
      expectedDurationMin: s.expectedDuration ?? 15
    }));
    res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    next(error);
  }
}

// GET /api/services/:id
async function getServiceById(req, res, next) {
  try {
    const service = await serviceCatalogService.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, error: 'Service not found' });

    res.status(200).json({ 
      success: true, 
      data: { ...service, expectedDurationMin: service.expectedDuration ?? 15 } 
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/services
async function createService(req, res, next) {
  try {
    const { name, description, expectedDurationMin, priority } = req.body;

    if (!name || expectedDurationMin == null) {
      return res.status(400).json({ success: false, error: 'Name and expectedDurationMin are required' });
    }

    const newService = await serviceCatalogService.create({
      name,
      description: description || '',
      expectedDuration: expectedDurationMin,
      priority: priority || 'medium'
    });

    res.status(201).json({ 
      success: true, 
      data: {
        id: newService.id,
        name: newService.name,
        description: newService.description,
        expectedDurationMin: newService.expectedDuration ?? 15,
        priority: newService.priority ?? 'medium',
        updatedAt: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/services/:id
async function updateService(req, res, next) {
  try {
    const { name, description, expectedDurationMin, priority } = req.body;

    const updated = await serviceCatalogService.update(req.params.id, {
      name,
      description,
      expectedDuration: expectedDurationMin,
      priority
    });

    if (!updated) return res.status(404).json({ success: false, error: 'Service not found' });

    res.status(200).json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        expectedDurationMin: updated.expectedDuration ?? 15,
        priority: updated.priority ?? 'medium',
        updatedAt: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/services/:id/join
async function joinQueue(req, res, next) {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });

    const result = await serviceCatalogService.addUserToQueue(req.params.id, userId);
    if (!result) return res.status(404).json({ success: false, error: 'Service not found' });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// POST /api/services/:id/leave
async function leaveQueue(req, res, next) {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });

    const success = await serviceCatalogService.removeUserFromQueue(req.params.id, userId);
    if (!success) return res.status(404).json({ success: false, error: 'Service or user not found' });

    res.status(200).json({ success: true, message: 'User removed from queue' });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/services/:id
async function deleteService(req, res, next) {
  try {
    const success = await serviceCatalogService.removeService(req.params.id);
    if (!success) return res.status(404).json({ success: false, error: 'Service not found' });

    res.status(200).json({ success: true, message: 'Service deleted successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  joinQueue,
  leaveQueue,
  deleteService
};
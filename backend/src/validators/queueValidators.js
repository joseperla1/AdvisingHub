const ALLOWED_PRIORITIES = ['low', 'medium', 'high', 'normal'];

function validateJoinQueuePayload(body) {
  const errors = [];

  if (!body.userId || typeof body.userId !== 'string') {
    errors.push('userId is required and must be a string.');
  }

  if (!body.name || typeof body.name !== 'string') {
    errors.push('name is required and must be a string.');
  } else if (body.name.trim().length === 0) {
    errors.push('name cannot be empty.');
  } else if (body.name.length > 100) {
    errors.push('name must not exceed 100 characters.');
  }

  if (!body.studentId || typeof body.studentId !== 'string') {
    errors.push('studentId is required and must be a string.');
  }

  if (!body.serviceId || typeof body.serviceId !== 'string') {
    errors.push('serviceId is required and must be a string.');
  }

  if (!body.serviceName || typeof body.serviceName !== 'string') {
    errors.push('serviceName is required and must be a string.');
  } else if (body.serviceName.trim().length === 0) {
    errors.push('serviceName cannot be empty.');
  } else if (body.serviceName.length > 100) {
    errors.push('serviceName must not exceed 100 characters.');
  }

  if (body.priority !== undefined) {
    if (typeof body.priority !== 'string' || !ALLOWED_PRIORITIES.includes(body.priority)) {
      errors.push('priority must be one of: low, medium, high, normal.');
    }
  }

  return errors;
}

module.exports = {
  validateJoinQueuePayload,
  ALLOWED_PRIORITIES
};
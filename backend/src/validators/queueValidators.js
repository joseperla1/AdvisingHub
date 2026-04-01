const ALLOWED_PRIORITIES = ['low', 'medium', 'high', 'normal'];

function validateJoinQueuePayload(body) {
  const errors = [];

  // REQUIRED: userId
  if (!body.userId || typeof body.userId !== 'string') {
    errors.push('userId is required and must be a string.');
  }

  // REQUIRED: display name (UserProfile.fullName equivalent)
  if (!body.name || typeof body.name !== 'string') {
    errors.push('name is required and must be a string.');
  } else if (body.name.trim().length === 0) {
    errors.push('name cannot be empty.');
  } else if (body.name.length > 100) {
    errors.push('name must not exceed 100 characters.');
  }

  // OPTIONAL: studentId (not needed if you already use userId)
  if (body.studentId !== undefined && typeof body.studentId !== 'string') {
    errors.push('studentId must be a string.');
  }

  // REQUIRED: serviceId
  if (!body.serviceId || typeof body.serviceId !== 'string') {
    errors.push('serviceId is required and must be a string.');
  }

  // OPTIONAL: serviceName
  if (body.serviceName !== undefined) {
    if (typeof body.serviceName !== 'string') {
      errors.push('serviceName must be a string.');
    } else if (body.serviceName.trim().length === 0) {
      errors.push('serviceName cannot be empty.');
    } else if (body.serviceName.length > 100) {
      errors.push('serviceName must not exceed 100 characters.');
    }
  }

  // OPTIONAL: priority
  if (body.priority !== undefined) {
    if (
      typeof body.priority !== 'string' ||
      !ALLOWED_PRIORITIES.includes(body.priority)
    ) {
      errors.push('priority must be one of: low, medium, high, normal.');
    }
  }

  if (body.notes !== undefined) {
    if (typeof body.notes !== 'string') {
      errors.push('notes must be a string.');
    } else if (body.notes.length > 500) {
      errors.push('notes must not exceed 500 characters.');
    }
  }

  return errors;
}

module.exports = {
  validateJoinQueuePayload,
  ALLOWED_PRIORITIES,
};
const { validateJoinQueuePayload } = require('../src/validators/queueValidators');

describe('Queue Validators', () => {
  test('returns no errors for valid payload', () => {
    const errors = validateJoinQueuePayload({
      userId: 'u101',
      name: 'John Smith',
      studentId: 'STU001',
      serviceId: 'svc1',
      serviceName: 'Transcript Request',
      priority: 'normal'
    });

    expect(errors).toEqual([]);
  });

  test('requires userId', () => {
    const errors = validateJoinQueuePayload({
      name: 'John Smith',
      studentId: 'STU001',
      serviceId: 'svc1',
      serviceName: 'Transcript Request'
    });

    expect(errors).toContain('userId is required and must be a string.');
  });

  test('requires non-empty name', () => {
    const errors = validateJoinQueuePayload({
      userId: 'u101',
      name: '',
      studentId: 'STU001',
      serviceId: 'svc1',
      serviceName: 'Transcript Request'
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  test('rejects name longer than 100 characters', () => {
    const errors = validateJoinQueuePayload({
      userId: 'u101',
      name: 'a'.repeat(101),
      studentId: 'STU001',
      serviceId: 'svc1',
      serviceName: 'Transcript Request'
    });

    expect(errors).toContain('name must not exceed 100 characters.');
  });

  test('requires studentId', () => {
    const errors = validateJoinQueuePayload({
      userId: 'u101',
      name: 'John Smith',
      serviceId: 'svc1',
      serviceName: 'Transcript Request'
    });

    expect(errors).toEqual([]);
  });

  test('requires serviceId', () => {
    const errors = validateJoinQueuePayload({
      userId: 'u101',
      name: 'John Smith',
      studentId: 'STU001',
      serviceName: 'Transcript Request'
    });

    expect(errors).toContain('serviceId is required and must be a string.');
  });

  test('requires serviceName', () => {
    const errors = validateJoinQueuePayload({
      userId: 'u101',
      name: 'John Smith',
      studentId: 'STU001',
      serviceId: 'svc1'
    });

    expect(errors).toEqual([]);
  });

  test('rejects invalid priority', () => {
    const errors = validateJoinQueuePayload({
      userId: 'u101',
      name: 'John Smith',
      studentId: 'STU001',
      serviceId: 'svc1',
      serviceName: 'Transcript Request',
      priority: 'urgent'
    });

    expect(errors).toContain('priority must be one of: low, medium, high, normal.');
  });
});
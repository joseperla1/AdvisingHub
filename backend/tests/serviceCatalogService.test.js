jest.mock('../src/repositories/serviceRepository', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  removeById: jest.fn(),
}));

const serviceRepository = require('../src/repositories/serviceRepository');
const serviceCatalogService = require('../src/services/serviceCatalogService.js');

describe('ServiceCatalogService', () => {
  describe('findAll', () => {
    test('returns an array including seeded services', async () => {
      serviceRepository.findAll.mockResolvedValue([
        { id: 'svc1', name: 'Transcript Request', description: '', expectedDurationMin: 10, priority: 'normal', isActive: true },
        { id: 'svc2', name: 'Enrollment Verification', description: '', expectedDurationMin: 8, priority: 'low', isActive: true },
      ]);
      const all = await serviceCatalogService.findAll();
      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBeGreaterThanOrEqual(2);
      const svc1 = all.find((s) => s.id === 'svc1');
      expect(svc1).toBeDefined();
      expect(svc1.name).toBe('Transcript Request');
    });

    test('delegates to repository each time', async () => {
      const a = await serviceCatalogService.findAll();
      const b = await serviceCatalogService.findAll();
      expect(serviceRepository.findAll.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(a).toBeDefined();
      expect(b).toBeDefined();
    });
  });

  describe('findById', () => {
    test('returns the service when id exists', async () => {
      serviceRepository.findById.mockResolvedValue({ id: 'svc1', name: 'Transcript Request', expectedDurationMin: 10, priority: 'normal' });
      const s = await serviceCatalogService.findById('svc1');
      expect(s).not.toBeNull();
      expect(s.id).toBe('svc1');
    });

    test('returns null when id does not exist', async () => {
      serviceRepository.findById.mockResolvedValue(null);
      expect(await serviceCatalogService.findById('does-not-exist-xyz')).toBeNull();
    });
  });

  describe('create', () => {
    test('appends a service with expected fields and an empty queue', async () => {
      serviceRepository.create.mockResolvedValue({ id: 'svc_new', name: 'Test Catalog Entry', description: 'integration test', expectedDurationMin: 12, priority: 'high' });
      const created = await serviceCatalogService.create({
        name: 'Test Catalog Entry',
        description: 'integration test',
        expectedDuration: 12,
        priority: 'high',
      });

      expect(created.name).toBe('Test Catalog Entry');
      expect(created.description).toBe('integration test');
      expect(created.priority).toBe('high');
    });

    test('uses defaults when optional fields are omitted', async () => {
      serviceRepository.create.mockResolvedValue({ id: 'svc_min', name: 'Minimal', description: '', expectedDurationMin: 15, priority: 'normal' });
      const created = await serviceCatalogService.create({
        name: 'Minimal',
      });
      expect(created.description).toBe('');
      expect(created.priority).toBe('normal');
    });
  });

  describe('update', () => {
    test('merges fields on an existing service', async () => {
      serviceRepository.update.mockResolvedValue({
        id: 'svc1',
        name: 'After',
        description: 'new desc',
        expectedDurationMin: 9,
        priority: 'normal',
      });
      const updated = await serviceCatalogService.update('svc1', {
        name: 'After',
        description: 'new desc',
        expectedDuration: 9,
        priority: 'medium',
      });

      expect(updated).not.toBeNull();
      expect(updated.name).toBe('After');
      expect(updated.description).toBe('new desc');
    });

    test('returns null when id does not exist', async () => {
      serviceRepository.update.mockResolvedValue(null);
      const result = await serviceCatalogService.update('missing-service-id', {
        name: 'x',
      });
      expect(result).toBeNull();
    });
  });

  describe('removeService', () => {
    test('removes a service and returns true', async () => {
      serviceRepository.removeById.mockResolvedValue(true);
      const ok = await serviceCatalogService.removeService('svc_rm');
      expect(ok).toBe(true);
    });

    test('returns false when id does not exist', async () => {
      serviceRepository.removeById.mockResolvedValue(false);
      const ok = await serviceCatalogService.removeService('not-a-real-service-id');
      expect(ok).toBe(false);
    });
  });
});

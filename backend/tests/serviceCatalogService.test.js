const serviceCatalogService = require('../src/services/serviceCatalogService.js');

describe('ServiceCatalogService', () => {
  describe('findAll', () => {
    test('returns an array including seeded services', async () => {
      const all = await serviceCatalogService.findAll();
      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBeGreaterThanOrEqual(4);
      const svc1 = all.find((s) => s.id === 'svc1');
      expect(svc1).toBeDefined();
      expect(svc1.name).toBe('Transcript Request');
      expect(Array.isArray(svc1.queue)).toBe(true);
    });

    test('returns a new array instance (shallow copy)', async () => {
      const a = await serviceCatalogService.findAll();
      const b = await serviceCatalogService.findAll();
      expect(a).not.toBe(b);
    });
  });

  describe('findById', () => {
    test('returns the service when id exists', async () => {
      const s = await serviceCatalogService.findById('svc1');
      expect(s).not.toBeNull();
      expect(s.id).toBe('svc1');
      expect(s.queue).toEqual([]);
    });

    test('returns null when id does not exist', async () => {
      expect(await serviceCatalogService.findById('does-not-exist-xyz')).toBeNull();
    });
  });

  describe('create', () => {
    test('appends a service with expected fields and an empty queue', async () => {
      const beforeLen = (await serviceCatalogService.findAll()).length;

      const created = await serviceCatalogService.create({
        name: 'Test Catalog Entry',
        description: 'integration test',
        expectedDuration: 12,
        priority: 'high',
      });

      expect(created.name).toBe('Test Catalog Entry');
      expect(created.description).toBe('integration test');
      expect(created.expectedDuration).toBe(12);
      expect(created.priority).toBe('high');
      expect(created.queue).toEqual([]);
      expect(created.id).toMatch(/^svc\d+$/);

      const afterLen = (await serviceCatalogService.findAll()).length;
      expect(afterLen).toBe(beforeLen + 1);

      await serviceCatalogService.removeService(created.id);
    });

    test('uses defaults when optional fields are omitted', async () => {
      const created = await serviceCatalogService.create({
        name: 'Minimal',
      });
      expect(created.description).toBe('');
      expect(created.expectedDuration).toBe(15);
      expect(created.priority).toBe('normal');
      expect(created.queue).toEqual([]);

      await serviceCatalogService.removeService(created.id);
    });
  });

  describe('update', () => {
    test('merges fields on an existing service', async () => {
      const created = await serviceCatalogService.create({
        name: 'Before',
        description: 'desc',
        expectedDuration: 5,
        priority: 'low',
      });

      const updated = await serviceCatalogService.update(created.id, {
        name: 'After',
        description: 'new desc',
        expectedDuration: 9,
        priority: 'medium',
      });

      expect(updated).not.toBeNull();
      expect(updated.name).toBe('After');
      expect(updated.description).toBe('new desc');
      expect(updated.expectedDuration).toBe(9);
      expect(updated.priority).toBe('medium');

      await serviceCatalogService.removeService(created.id);
    });

    test('returns null when id does not exist', async () => {
      const result = await serviceCatalogService.update('missing-service-id', {
        name: 'x',
      });
      expect(result).toBeNull();
    });
  });

  describe('removeService', () => {
    test('removes a service and returns true', async () => {
      const created = await serviceCatalogService.create({
        name: 'To Remove',
        description: '',
        expectedDuration: 1,
      });

      const ok = await serviceCatalogService.removeService(created.id);
      expect(ok).toBe(true);
      expect(await serviceCatalogService.findById(created.id)).toBeNull();
    });

    test('returns false when id does not exist', async () => {
      const ok = await serviceCatalogService.removeService('not-a-real-service-id');
      expect(ok).toBe(false);
    });
  });
});

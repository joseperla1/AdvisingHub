const request = require('supertest');
const app = require('../src/app');
jest.mock('../src/services/serviceCatalogService', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  removeService: jest.fn(),
}));
const serviceCatalogService = require('../src/services/serviceCatalogService');

describe('Service Catalog Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/services returns all services', async () => {
    serviceCatalogService.findAll.mockResolvedValue([
      { id: 'svc1', name: 'Transcript Request', description: '', expectedDurationMin: 10, priority: 'normal' },
      { id: 'svc2', name: 'Graduation Check', description: '', expectedDurationMin: 20, priority: 'high' },
    ]);
    const response = await request(app).get('/api/services');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBe(2);
    expect(response.body.data[0]).toHaveProperty('name');
    expect(response.body.data[0]).toHaveProperty('expectedDurationMin');
  });

  test('GET /api/services/:id returns 404 when missing', async () => {
    serviceCatalogService.findById.mockResolvedValue(null);
    const res = await request(app).get('/api/services/missing');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/services/:id returns service with expectedDurationMin mapping', async () => {
    serviceCatalogService.findById.mockResolvedValue({ id: 'svc1', name: 'X', expectedDurationMin: 12 });
    const res = await request(app).get('/api/services/svc1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.expectedDurationMin).toBe(12);
  });

  test('POST /api/services returns 400 when name or expectedDurationMin missing', async () => {
    const res = await request(app).post('/api/services').send({ name: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/services creates service', async () => {
    serviceCatalogService.create.mockResolvedValue({
      id: 'svc_new',
      name: 'New',
      description: 'd',
      expectedDurationMin: 10,
      priority: 'normal',
    });
    const res = await request(app).post('/api/services').send({ name: 'New', description: 'd', expectedDurationMin: 10 });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('svc_new');
  });

  test('PUT /api/services/:id returns 404 when missing', async () => {
    serviceCatalogService.update.mockResolvedValue(null);
    const res = await request(app).put('/api/services/missing').send({ name: 'x' });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('PUT /api/services/:id updates service', async () => {
    serviceCatalogService.update.mockResolvedValue({
      id: 'svc1',
      name: 'After',
      description: '',
      expectedDurationMin: 9,
      priority: 'high',
    });
    const res = await request(app).put('/api/services/svc1').send({ name: 'After', expectedDurationMin: 9, priority: 'high' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('After');
  });

  test('DELETE /api/services/:id returns 404 when missing', async () => {
    serviceCatalogService.removeService.mockResolvedValue(false);
    const res = await request(app).delete('/api/services/missing');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('DELETE /api/services/:id deletes service', async () => {
    serviceCatalogService.removeService.mockResolvedValue(true);
    const res = await request(app).delete('/api/services/svc1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
const request = require('supertest');
const app = require('../src/app');
const { services } = require('../src/data/servicesStores');

describe('Service Catalog Routes', () => {
  beforeEach(() => {
    services.length = 0;

    services.push(
      {
        id: 'svc1',
        name: 'Transcript Request',
        description: 'Official and unofficial transcript processing.',
        expectedDurationMin: 10,
        priority: 'normal'
      },
      {
        id: 'svc2',
        name: 'Graduation Check',
        description: 'Degree audit and graduation readiness review.',
        expectedDurationMin: 20,
        priority: 'high'
      }
    );
  });

  test('GET /api/services returns all services', async () => {
    const response = await request(app).get('/api/services');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBe(2);
    expect(response.body.data[0]).toHaveProperty('name');
    expect(response.body.data[0]).toHaveProperty('expectedDurationMin');
  });
});
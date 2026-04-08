jest.mock('../src/config/db', () => {
  const sql = {
    VarChar: jest.fn(() => 'VarChar'),
    Int: 'Int',
    Bit: 'Bit',
    MAX: 'MAX',
  };
  return {
    sql,
    getPool: jest.fn(),
  };
});

const { buildMockPool } = require('./_helpers/mockMssql');
const { getPool } = require('../src/config/db');
const serviceRepository = require('../src/repositories/serviceRepository');

describe('ServiceRepository (DB integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('findAll issues query and returns recordset', async () => {
    const pool = buildMockPool();
    const req = pool.request();
    pool.request.mockReturnValue(req);
    req.query.mockResolvedValueOnce({ recordset: [{ id: 'svc1' }] });
    getPool.mockResolvedValue(pool);

    const rows = await serviceRepository.findAll();
    expect(pool.request).toHaveBeenCalled();
    expect(rows[0].id).toBe('svc1');
  });

  test('findById binds service_code input', async () => {
    const pool = buildMockPool();
    const req = pool.request();
    pool.request.mockReturnValue(req);
    req.query.mockResolvedValueOnce({ recordset: [{ id: 'svc1' }] });
    getPool.mockResolvedValue(pool);

    const row = await serviceRepository.findById('svc1');
    expect(req.input).toHaveBeenCalledWith('service_code', expect.anything(), 'svc1');
    expect(row.id).toBe('svc1');
  });

  test('removeById returns true when rowsAffected > 0', async () => {
    const pool = buildMockPool();
    const req = pool.request();
    pool.request.mockReturnValue(req);
    req.query.mockResolvedValueOnce({ recordset: [], rowsAffected: [1] });
    getPool.mockResolvedValue(pool);

    const ok = await serviceRepository.removeById('svc1');
    expect(ok).toBe(true);
    expect(req.input).toHaveBeenCalledWith('service_code', expect.anything(), 'svc1');
  });

  test('create binds inputs and calls findById', async () => {
    const pool = buildMockPool();
    const req = pool.request();
    pool.request.mockReturnValue(req);
    req.query.mockResolvedValueOnce({ recordset: [], rowsAffected: [1] });
    getPool.mockResolvedValue(pool);

    const spy = jest.spyOn(serviceRepository, 'findById').mockResolvedValue({ id: 'svc_new' });
    const row = await serviceRepository.create({
      id: 'svc_new',
      name: 'New',
      description: 'd',
      expectedDurationMin: 10,
      priority: 'normal',
      isActive: true,
    });
    expect(req.input).toHaveBeenCalledWith('service_code', expect.anything(), 'svc_new');
    expect(spy).toHaveBeenCalledWith('svc_new');
    expect(row.id).toBe('svc_new');
    spy.mockRestore();
  });

  test('update returns null when service missing', async () => {
    const spy = jest.spyOn(serviceRepository, 'findById').mockResolvedValue(null);
    const row = await serviceRepository.update('svc_missing', { name: 'x' });
    expect(row).toBeNull();
    spy.mockRestore();
  });
});


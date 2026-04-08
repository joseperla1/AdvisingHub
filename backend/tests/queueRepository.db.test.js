jest.mock('../src/config/db', () => {
  const sql = {
    VarChar: jest.fn(() => 'VarChar'),
    BigInt: 'BigInt',
    MAX: 'MAX',
  };
  return {
    sql,
    getPool: jest.fn(),
  };
});

const { buildMockPool } = require('./_helpers/mockMssql');
const { getPool } = require('../src/config/db');
const queueRepository = require('../src/repositories/queueRepository');

describe('QueueRepository (DB integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('findById binds queue_entry_code input', async () => {
    const pool = buildMockPool();
    const req = pool.request();
    pool.request.mockReturnValue(req);
    req.query.mockResolvedValueOnce({ recordset: [{ id: 'qe1' }] });
    getPool.mockResolvedValue(pool);

    const row = await queueRepository.findById('qe1');
    expect(req.input).toHaveBeenCalledWith('queue_entry_code', expect.anything(), 'qe1');
    expect(row.id).toBe('qe1');
  });

  test('updateById binds inputs and updates', async () => {
    const pool = buildMockPool();
    const req = pool.request();
    pool.request.mockReturnValue(req);

    // findById inside updateById
    req.query
      .mockResolvedValueOnce({ recordset: [{ id: 'qe1', status: 'waiting', notes: null }] })
      // update query
      .mockResolvedValueOnce({ recordset: [], rowsAffected: [1] })
      // findById again
      .mockResolvedValueOnce({ recordset: [{ id: 'qe1', status: 'served' }] });

    getPool.mockResolvedValue(pool);

    const row = await queueRepository.updateById('qe1', { status: 'served', notes: 'x' });
    expect(req.input).toHaveBeenCalledWith('queue_entry_code', expect.anything(), 'qe1');
    expect(req.input).toHaveBeenCalledWith('status', expect.anything(), 'served');
    expect(req.query).toHaveBeenCalled();
    expect(row.status).toBe('served');
  });

  test('findAll issues query', async () => {
    const pool = buildMockPool();
    const req = pool.request();
    pool.request.mockReturnValue(req);
    req.query.mockResolvedValueOnce({ recordset: [{ id: 'qe1' }] });
    getPool.mockResolvedValue(pool);

    const rows = await queueRepository.findAll();
    expect(req.query).toHaveBeenCalled();
    expect(rows[0].id).toBe('qe1');
  });

  test('findByStudentId binds student_id input', async () => {
    const pool = buildMockPool();
    const req = pool.request();
    pool.request.mockReturnValue(req);
    req.query.mockResolvedValueOnce({ recordset: [{ id: 'qe1' }] });
    getPool.mockResolvedValue(pool);

    const row = await queueRepository.findByStudentId('20260001');
    expect(req.input).toHaveBeenCalledWith('student_id', expect.anything(), '20260001');
    expect(row.id).toBe('qe1');
  });

  test('removeById binds queue_entry_code and returns boolean', async () => {
    const pool = buildMockPool();
    const req = pool.request();
    pool.request.mockReturnValue(req);
    req.query.mockResolvedValueOnce({ recordset: [], rowsAffected: [1] });
    getPool.mockResolvedValue(pool);

    const ok = await queueRepository.removeById('qe1');
    expect(req.input).toHaveBeenCalledWith('queue_entry_code', expect.anything(), 'qe1');
    expect(ok).toBe(true);
  });
});


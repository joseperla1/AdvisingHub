jest.mock('../src/config/db', () => {
  const sql = {
    VarChar: jest.fn(() => 'VarChar'),
    MAX: 'MAX',
  };
  return {
    sql,
    getPool: jest.fn(),
  };
});

const { buildMockPool } = require('./_helpers/mockMssql');
const { getPool } = require('../src/config/db');
const notificationRepository = require('../src/repositories/notificationRepository');

describe('NotificationRepository (DB integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('findByUserId binds user_code', async () => {
    const pool = buildMockPool();
    const req = pool.request();
    pool.request.mockReturnValue(req);
    req.query.mockResolvedValueOnce({ recordset: [{ id: 'evt1' }] });
    getPool.mockResolvedValue(pool);

    const rows = await notificationRepository.findByUserId('usr1');
    expect(req.input).toHaveBeenCalledWith('user_code', expect.anything(), 'usr1');
    expect(rows[0].id).toBe('evt1');
  });

  test('create binds inputs and issues insert', async () => {
    const pool = buildMockPool();
    const req = pool.request();
    pool.request.mockReturnValue(req);
    req.query.mockResolvedValueOnce({ recordset: [], rowsAffected: [1] });
    getPool.mockResolvedValue(pool);

    await notificationRepository.create({
      userId: 'usr1',
      queueId: 'qe1',
      type: 'queue_joined',
      message: 'hi',
      createdAt: new Date().toISOString(),
    });
    expect(req.input).toHaveBeenCalledWith('user_code', expect.anything(), 'usr1');
    expect(req.query).toHaveBeenCalled();
  });

  test('findAll issues query', async () => {
    const pool = buildMockPool();
    const req = pool.request();
    pool.request.mockReturnValue(req);
    req.query.mockResolvedValueOnce({ recordset: [{ id: 'evt1' }] });
    getPool.mockResolvedValue(pool);

    const rows = await notificationRepository.findAll();
    expect(req.query).toHaveBeenCalled();
    expect(rows[0].id).toBe('evt1');
  });
});


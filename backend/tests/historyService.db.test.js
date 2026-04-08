jest.mock('../src/config/db', () => {
  const sql = {
    VarChar: jest.fn(() => 'VarChar'),
  };
  return {
    sql,
    getPool: jest.fn(),
  };
});

jest.mock('../src/utils/codeGenerator', () => ({
  eventCode: jest.fn(() => 'evt_test'),
}));

const { buildMockPool } = require('./_helpers/mockMssql');
const { getPool } = require('../src/config/db');
const historyService = require('../src/services/historyService');

describe('HistoryService (DB integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getHistoryByUserId binds user_code and returns recordset', async () => {
    const pool = buildMockPool();
    const req = pool.request();
    pool.request.mockReturnValue(req);
    req.query.mockResolvedValueOnce({ recordset: [{ id: 'qe1' }] });
    getPool.mockResolvedValue(pool);

    const rows = await historyService.getHistoryByUserId('usr1');
    expect(req.input).toHaveBeenCalledWith('user_code', expect.anything(), 'usr1');
    expect(rows[0].id).toBe('qe1');
  });

  test('addHistoryEntry inserts into notification_history', async () => {
    const pool = buildMockPool();
    const req = pool.request();
    pool.request.mockReturnValue(req);
    req.query.mockResolvedValueOnce({ recordset: [], rowsAffected: [1] });
    getPool.mockResolvedValue(pool);

    const row = await historyService.addHistoryEntry({
      userId: 'usr1',
      queueId: 'qe1',
      name: 'John',
      serviceName: 'Transcript Request',
      action: 'joined',
      status: 'joined',
    });

    expect(req.input).toHaveBeenCalledWith('event_code', expect.anything(), 'evt_test');
    expect(req.input).toHaveBeenCalledWith('user_code', expect.anything(), 'usr1');
    expect(row.id).toBe('evt_test');
    expect(row.status).toBe('joined');
  });
});


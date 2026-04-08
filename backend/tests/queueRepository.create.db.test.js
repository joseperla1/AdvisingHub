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

jest.mock('../src/utils/codeGenerator', () => ({
  queueCode: jest.fn(() => 'q_code'),
  queueEntryCode: jest.fn(() => 'qe_code'),
}));

const { getPool } = require('../src/config/db');
const queueRepository = require('../src/repositories/queueRepository');

function buildReq(result) {
  const req = {
    input: jest.fn(() => req),
    query: jest.fn(async () => result),
  };
  return req;
}

describe('QueueRepository.create (DB integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates queue entry when open queue exists', async () => {
    const req1 = buildReq({ recordset: [{ queueId: 10 }] }); // ensureQueue
    const req2 = buildReq({ recordset: [], rowsAffected: [1] }); // insert queue_entries
    const pool = { request: jest.fn() };
    pool.request.mockReturnValueOnce(req1).mockReturnValueOnce(req2);
    getPool.mockResolvedValue(pool);

    const spy = jest.spyOn(queueRepository, 'findById').mockResolvedValue({ id: 'qe_code' });

    const row = await queueRepository.create({
      userId: 'usr1',
      name: 'John',
      studentId: '20260001',
      serviceId: 'svc1',
      serviceName: 'Transcript Request',
      priority: 'normal',
      status: 'waiting',
      notes: null,
    });

    expect(req1.query).toHaveBeenCalled();
    expect(req2.query).toHaveBeenCalled();
    expect(row.id).toBe('qe_code');
    spy.mockRestore();
  });

  test('creates queue when missing open queue', async () => {
    const req1 = buildReq({ recordset: [] }); // ensureQueue no rows
    const req2 = buildReq({ recordset: [{ queueId: 11 }] }); // insert queues
    const req3 = buildReq({ recordset: [], rowsAffected: [1] }); // insert queue_entries
    const pool = { request: jest.fn() };
    pool.request.mockReturnValueOnce(req1).mockReturnValueOnce(req2).mockReturnValueOnce(req3);
    getPool.mockResolvedValue(pool);

    const spy = jest.spyOn(queueRepository, 'findById').mockResolvedValue({ id: 'qe_code' });

    const row = await queueRepository.create({
      userId: 'usr1',
      name: 'John',
      studentId: '20260001',
      serviceId: 'svc1',
      serviceName: 'Transcript Request',
      priority: 'normal',
      status: 'waiting',
      notes: null,
    });

    expect(req2.input).toHaveBeenCalledWith('queue_code', expect.anything(), 'q_code');
    expect(row.id).toBe('qe_code');
    spy.mockRestore();
  });
});


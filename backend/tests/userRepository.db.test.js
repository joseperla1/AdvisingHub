jest.mock('../src/config/db', () => {
  const sql = {
    VarChar: jest.fn(() => 'VarChar'),
    BigInt: 'BigInt',
    Transaction: class {
      begin = jest.fn(async () => {});
      commit = jest.fn(async () => {});
      rollback = jest.fn(async () => {});
      constructor() {}
    },
    Request: class {
      constructor() {
        this.input = jest.fn(() => this);
        this.query = jest.fn(async () => ({ recordset: [{ id: 1 }] }));
      }
    },
  };
  return {
    sql,
    getPool: jest.fn(),
  };
});

const { buildMockPool } = require('./_helpers/mockMssql');
const { getPool } = require('../src/config/db');
const userRepository = require('../src/repositories/userRepository');

describe('UserRepository (DB integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('findCredentialByEmail lowercases and binds email', async () => {
    const pool = buildMockPool();
    const req = pool.request();
    pool.request.mockReturnValue(req);
    req.query.mockResolvedValueOnce({ recordset: [{ email: 'x' }] });
    getPool.mockResolvedValue(pool);

    await userRepository.findCredentialByEmail('TEST@EXAMPLE.COM');
    expect(req.input).toHaveBeenCalledWith('email', expect.anything(), 'test@example.com');
  });

  test('findByUserCode binds user_code', async () => {
    const pool = buildMockPool();
    const req = pool.request();
    pool.request.mockReturnValue(req);
    req.query.mockResolvedValueOnce({ recordset: [{ id: 'usr1' }] });
    getPool.mockResolvedValue(pool);

    const row = await userRepository.findByUserCode('usr1');
    expect(req.input).toHaveBeenCalledWith('user_code', expect.anything(), 'usr1');
    expect(row.id).toBe('usr1');
  });

  test('findDefaultAdvisor queries without inputs', async () => {
    const pool = buildMockPool();
    const req = pool.request();
    pool.request.mockReturnValue(req);
    req.query.mockResolvedValueOnce({ recordset: [{ id: 'adm1' }] });
    getPool.mockResolvedValue(pool);

    const row = await userRepository.findDefaultAdvisor();
    expect(req.query).toHaveBeenCalled();
    expect(row.id).toBe('adm1');
  });

  test('createUserWithProfile runs transaction and returns created user', async () => {
    const pool = buildMockPool();
    getPool.mockResolvedValue(pool);

    const spy = jest.spyOn(userRepository, 'findByUserCode').mockResolvedValue({ id: 'usr_created' });
    const row = await userRepository.createUserWithProfile({
      email: 'x@example.com',
      passwordHash: 'hash',
      fullName: 'X',
      role: 'user',
    });
    expect(row.id).toBe('usr_created');
    spy.mockRestore();
  });
});


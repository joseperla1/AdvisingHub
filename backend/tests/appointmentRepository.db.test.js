jest.mock('../src/config/db', () => {
  const sql = {
    VarChar: jest.fn(() => 'VarChar'),
    Date: 'Date',
    Time: 'Time',
    Int: 'Int',
    MAX: 'MAX',
  };
  return {
    sql,
    getPool: jest.fn(),
  };
});

const { buildMockPool } = require('./_helpers/mockMssql');
const { getPool } = require('../src/config/db');
const appointmentRepository = require('../src/repositories/appointmentRepository');

describe('AppointmentRepository (DB integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('findByStudentId binds student_id input', async () => {
    const pool = buildMockPool();
    const req = pool.request();
    pool.request.mockReturnValue(req);
    req.query.mockResolvedValueOnce({ recordset: [{ id: 'apt1' }] });
    getPool.mockResolvedValue(pool);

    const rows = await appointmentRepository.findByStudentId('20260001');
    expect(req.input).toHaveBeenCalledWith('student_id', expect.anything(), '20260001');
    expect(rows[0].id).toBe('apt1');
  });

  test('findAll issues query', async () => {
    const pool = buildMockPool();
    const req = pool.request();
    pool.request.mockReturnValue(req);
    req.query.mockResolvedValueOnce({ recordset: [{ id: 'apt1' }] });
    getPool.mockResolvedValue(pool);

    const rows = await appointmentRepository.findAll();
    expect(req.query).toHaveBeenCalled();
    expect(rows[0].id).toBe('apt1');
  });

  test('findById binds appointment_code input', async () => {
    const pool = buildMockPool();
    const req = pool.request();
    pool.request.mockReturnValue(req);
    req.query.mockResolvedValueOnce({ recordset: [{ id: 'apt1' }] });
    getPool.mockResolvedValue(pool);

    const row = await appointmentRepository.findById('apt1');
    expect(req.input).toHaveBeenCalledWith('appointment_code', expect.anything(), 'apt1');
    expect(row.id).toBe('apt1');
  });

  test('create binds inputs and calls findById', async () => {
    const pool = buildMockPool();
    const req = pool.request();
    pool.request.mockReturnValue(req);
    req.query.mockResolvedValueOnce({ recordset: [], rowsAffected: [1] });
    getPool.mockResolvedValue(pool);

    const spy = jest.spyOn(appointmentRepository, 'findById').mockResolvedValue({ id: 'apt_new' });
    const row = await appointmentRepository.create({
      studentId: '20260001',
      studentName: 'John',
      serviceId: 'svc1',
      serviceName: 'Transcript Request',
      advisorId: 'adm1',
      advisor: 'Admin Smith',
      appointmentDate: '2026-04-01',
      appointmentTime: '10:00:00',
      status: 'Scheduled',
      queuePosition: null,
      notes: null,
    });
    expect(req.input).toHaveBeenCalledWith('service_code', expect.anything(), 'svc1');
    expect(spy).toHaveBeenCalled();
    expect(row.id).toBe('apt_new');
    spy.mockRestore();
  });
});


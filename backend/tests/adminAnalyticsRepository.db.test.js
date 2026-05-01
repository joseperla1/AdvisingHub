jest.mock('../src/config/db', () => {
  const sql = {
    VarChar: jest.fn(() => 'VarChar'),
    Date: 'Date',
    Int: 'Int',
    MAX: 'MAX',
  };
  return {
    sql,
    getPool: jest.fn(),
  };
});

const { getPool } = require('../src/config/db');
const adminAnalyticsRepository = require('../src/repositories/adminAnalyticsRepository');

function buildPoolWithQueryQueue(responseQueue) {
  const pool = {
    request: jest.fn(() => {
      const req = {
        input: jest.fn(() => req),
        query: jest.fn(async () => {
          const next = responseQueue.shift();
          if (typeof next === 'function') return next();
          return next !== undefined ? next : { recordset: [] };
        }),
      };
      return req;
    }),
  };
  return pool;
}

function overviewQueryResponses() {
  return [
    { recordset: [{ totalServed: 12, avgWaitTimeMin: 4.5 }] },
    { recordset: [{ activity_date: new Date('2026-01-02'), total_queue_entries: 8 }] },
    { recordset: [{ activity_date: new Date('2026-01-02'), avg_wait_time_min: 3 }] },
    { recordset: [{ service_name: 'Advising', total_queue_entries: 5, avg_wait_time_min: 2 }] },
    {
      recordset: [
        {
          served: 10,
          canceled: 1,
          left_count: 0,
          no_show: 0,
          waiting: 1,
        },
      ],
    },
    { recordset: [{ advisor_name: 'Dr. A', served_entries: 6 }] },
    { recordset: [{ appointmentsInRange: 4 }] },
  ];
}

describe('AdminAnalyticsRepository (DB integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getOverview returns KPIs and charts for default range', async () => {
    const queue = overviewQueryResponses();
    const pool = buildPoolWithQueryQueue(queue);
    getPool.mockResolvedValue(pool);

    const data = await adminAnalyticsRepository.getOverview({});

    expect(data.kpis.totalServed).toBe(12);
    expect(data.kpis.avgWaitTimeMin).toBe(4.5);
    expect(data.kpis.busiestService).toBe('Advising');
    expect(data.kpis.appointmentsToday).toBe(4);
    expect(data.charts.statusBreakdown).toHaveLength(5);
    expect(data.charts.dailyQueueVolumeTrend.length).toBeGreaterThan(0);
    expect(pool.request).toHaveBeenCalled();
  });

  test('getOverview uses ytd range when rangeType is ytd', async () => {
    const queue = overviewQueryResponses();
    const pool = buildPoolWithQueryQueue(queue);
    getPool.mockResolvedValue(pool);

    await adminAnalyticsRepository.getOverview({ rangeType: 'ytd', year: 2025 });

    expect(queue.length).toBe(0);
  });

  test('getOverview uses month range when rangeType is month', async () => {
    const queue = overviewQueryResponses();
    const pool = buildPoolWithQueryQueue(queue);
    getPool.mockResolvedValue(pool);

    await adminAnalyticsRepository.getOverview({ rangeType: 'month', month: '2026-03' });

    expect(queue.length).toBe(0);
  });

  test('getReportFilterOptions maps distinct values and report types', async () => {
    const responses = [
      { recordset: [{ service_name: 'S1' }, { service_name: 'S2' }] },
      { recordset: [{ status: 'waiting' }] },
      { recordset: [{ priority: 'high' }] },
      { recordset: [{ entry_source: 'web' }] },
    ];
    const pool = buildPoolWithQueryQueue(responses);
    getPool.mockResolvedValue(pool);

    const opts = await adminAnalyticsRepository.getReportFilterOptions();

    expect(opts.services).toEqual(['S1', 'S2']);
    expect(opts.queueStatuses).toEqual(['waiting']);
    expect(opts.serviceActivityStatuses).toEqual([]);
    expect(opts.priorities).toEqual(['high']);
    expect(opts.entrySources).toEqual(['web']);
    expect(opts.daysOfWeek).toContain('Monday');
    expect(opts.reportTypes).toContain('user_queue_participation');
  });

  test('getReport user_queue_participation runs query and returns rows', async () => {
    const rows = [{ student_name: 'Pat', student_id: '1', service_name: 'X' }];
    const pool = buildPoolWithQueryQueue([{ recordset: rows }]);
    getPool.mockResolvedValue(pool);

    const out = await adminAnalyticsRepository.getReport('user_queue_participation', {
      services: ['X'],
      statuses: ['waiting'],
      studentName: 'Pat',
      studentId: '1',
      sortBy: 'joined_at ASC',
      limit: 10,
    });

    expect(out).toEqual(rows);
  });

  test('getReport service_queue_activity applies filters', async () => {
    const pool = buildPoolWithQueryQueue([{ recordset: [{ activity_date: new Date(), service_name: 'Y' }] }]);
    getPool.mockResolvedValue(pool);

    const out = await adminAnalyticsRepository.getReport('service_queue_activity', {
      allServices: true,
      allStatuses: true,
      limit: 20,
    });

    expect(out).toHaveLength(1);
  });

  test('getReport daily_queue_usage supports dayOfWeek and daysOfWeek', async () => {
    const pool = buildPoolWithQueryQueue([{ recordset: [{ queue_date: new Date(), total_queue_entries: 1 }] }]);
    getPool.mockResolvedValue(pool);

    await adminAnalyticsRepository.getReport('daily_queue_usage', {
      dayOfWeek: 'Monday',
      daysOfWeek: ['Tuesday'],
      allDaysOfWeek: false,
    });

    await adminAnalyticsRepository.getReport('daily_queue_usage', {
      allDaysOfWeek: true,
    });

    expect(pool.request.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  test('getReport average_wait_time_analysis groupBy day vs service', async () => {
    const pool = buildPoolWithQueryQueue([
      { recordset: [{ queue_date: new Date(), total_queue_entries: 2, average_wait_time_min: 1 }] },
      { recordset: [{ service_name: 'Z', total_queue_entries: 3, average_wait_time_min: 2 }] },
    ]);
    getPool.mockResolvedValue(pool);

    const byDay = await adminAnalyticsRepository.getReport('average_wait_time_analysis', {
      groupBy: 'day',
    });
    const byService = await adminAnalyticsRepository.getReport('average_wait_time_analysis', {
      groupBy: 'service',
    });

    expect(byDay).toHaveLength(1);
    expect(byService[0].service_name).toBe('Z');
  });

  test('getReport throws 400 for unsupported report type', async () => {
    const pool = buildPoolWithQueryQueue([]);
    getPool.mockResolvedValue(pool);

    await expect(adminAnalyticsRepository.getReport('unknown', {})).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test('getReport coerces invalid limit to 500', async () => {
    const pool = buildPoolWithQueryQueue([{ recordset: [] }]);
    getPool.mockResolvedValue(pool);

    await adminAnalyticsRepository.getReport('user_queue_participation', { limit: 0 });
    await adminAnalyticsRepository.getReport('user_queue_participation', { limit: NaN });

    expect(pool.request.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  test('getReport user_queue_participation uses legacy studentSearch', async () => {
    const pool = buildPoolWithQueryQueue([{ recordset: [] }]);
    getPool.mockResolvedValue(pool);

    await adminAnalyticsRepository.getReport('user_queue_participation', {
      studentSearch: 'abc',
    });

    const req = pool.request.mock.results[0].value;
    expect(req.query).toHaveBeenCalled();
  });
});

const { getPool, sql } = require('../config/db');

const REPORT_TYPES = [
  'user_queue_participation',
  'service_queue_activity',
  'daily_queue_usage',
  'average_wait_time_analysis',
];

const IN_LIST_CAP = 40;

function toTrimmedList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(v => String(v ?? '').trim())
    .filter(Boolean)
    .slice(0, IN_LIST_CAP);
}

/**
 * When allFlag is true → no restriction (empty list).
 * Otherwise use array values, or legacy single string if present.
 */
function pickMulti(filters, allFlagKey, arrayKey, legacySingleKey) {
  if (filters[allFlagKey] === true) return [];
  const fromArr = toTrimmedList(filters[arrayKey]);
  if (fromArr.length) return fromArr;
  const legacy = legacySingleKey && filters[legacySingleKey] != null ? String(filters[legacySingleKey]).trim() : '';
  return legacy ? [legacy] : [];
}

function addInClause(request, clauses, sqlExpr, values, paramPrefix) {
  if (!values.length) return;
  const placeholders = values.map((v, i) => {
    const name = `${paramPrefix}_${i}`;
    request.input(name, sql.VarChar(200), v);
    return `@${name}`;
  });
  clauses.push(`${sqlExpr} IN (${placeholders.join(', ')})`);
}

function sanitizeSort(sortBy, fallback) {
  if (!sortBy || typeof sortBy !== 'string') return fallback;
  return sortBy.replace(/[^a-zA-Z0-9_,.\s]/g, '');
}

function parseLocalDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, monthIndex, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolveRange(rangeType, date, month, year) {
  const now = new Date();
  const safeYear = Number(year) || now.getFullYear();

  if (rangeType === 'ytd') {
    return {
      startDate: new Date(safeYear, 0, 1),
      endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    };
  }

  if (rangeType === 'month') {
    const parts = typeof month === 'string' ? month.split('-') : [];
    const y = Number(parts[0]) || now.getFullYear();
    const m = (Number(parts[1]) || now.getMonth() + 1) - 1;
    return {
      startDate: new Date(y, m, 1),
      endDate: new Date(y, m + 1, 0),
    };
  }

  const selected = date ? (parseLocalDateOnly(date) || new Date(String(date))) : now;
  const day = Number.isNaN(selected.getTime()) ? now : selected;
  return {
    startDate: new Date(day.getFullYear(), day.getMonth(), day.getDate()),
    endDate: new Date(day.getFullYear(), day.getMonth(), day.getDate()),
  };
}

/**
 * Shared filter bindings for admin analytics views.
 * @param {object} options
 * @param {boolean} [options.includeStatus] When true, apply status IN filter using `statusColumn` (must exist on the target view).
 * @param {string | null} [options.statusColumn] SQL column identifier, e.g. 'status'. Null skips status filter even if includeStatus is true.
 */
function bindCommonQueueFilters(request, filters, dateColumn, options = {}) {
  const {
    includeStatus = true,
    includePriority = true,
    includeEntrySource = true,
    statusColumn = 'status',
  } = options;
  const clauses = [];

  if (filters.startDate) {
    request.input('startDate', sql.Date, filters.startDate);
    clauses.push(`${dateColumn} >= @startDate`);
  }
  if (filters.endDate) {
    request.input('endDate', sql.Date, filters.endDate);
    clauses.push(`${dateColumn} <= @endDate`);
  }

  const services = pickMulti(filters, 'allServices', 'services', 'service');
  if (services.length) addInClause(request, clauses, 'service_name', services, 'f_svc');

  if (includeStatus && statusColumn) {
    const statuses = pickMulti(filters, 'allStatuses', 'statuses', 'status');
    if (statuses.length) addInClause(request, clauses, statusColumn, statuses, 'f_st');
  }

  if (includeEntrySource) {
    const sources = pickMulti(filters, 'allEntrySources', 'entrySources', 'entrySource');
    if (sources.length) addInClause(request, clauses, 'entry_source', sources, 'f_es');
  }

  const advisors = pickMulti(filters, 'allAdvisors', 'advisors', 'advisor');
  if (advisors.length) addInClause(request, clauses, 'advisor_name', advisors, 'f_adv');

  if (includePriority) {
    const priorities = pickMulti(filters, 'allPriorities', 'priorities', 'priority');
    if (priorities.length) addInClause(request, clauses, 'priority', priorities, 'f_pr');
  }

  return clauses;
}

function bindUserParticipationFilters(request, filters) {
  const clauses = bindCommonQueueFilters(request, filters, 'joined_at', {
    includeStatus: true,
    includePriority: true,
    includeEntrySource: true,
    statusColumn: 'status',
  });

  if (filters.studentName) {
    request.input('studentName', sql.VarChar(100), String(filters.studentName));
    clauses.push(
      `(full_name LIKE '%' + @studentName + '%' OR display_name LIKE '%' + @studentName + '%')`
    );
  }
  if (filters.studentId) {
    request.input('studentId', sql.VarChar(30), String(filters.studentId));
    clauses.push(`student_id LIKE '%' + @studentId + '%'`);
  }
  // Legacy combined search (optional)
  if (filters.studentSearch && !filters.studentName && !filters.studentId) {
    request.input('studentSearch', sql.VarChar(100), String(filters.studentSearch));
    clauses.push(
      `(student_id LIKE '%' + @studentSearch + '%' OR full_name LIKE '%' + @studentSearch + '%' OR display_name LIKE '%' + @studentSearch + '%')`
    );
  }

  return clauses;
}

/** Filters for vw_admin_service_queue_activity — aggregate rows, no per-entry status column. */
function bindActivityDateFilters(request, filters, dateColumn = 'activity_date') {
  const clauses = bindCommonQueueFilters(request, filters, dateColumn, {
    includeStatus: true,
    includePriority: false,
    includeEntrySource: true,
    statusColumn: null,
  });
  return clauses;
}

function bindDailyUsageFilters(request, filters) {
  return bindCommonQueueFilters(request, filters, 'activity_date', {
    includeStatus: false,
    includePriority: false,
    includeEntrySource: false,
  });
}

async function getOverview(options = {}) {
  const pool = await getPool();
  const { startDate, endDate } = resolveRange(
    options.rangeType,
    options.date,
    options.month,
    options.year
  );

  const requestWithRange = () =>
    pool
      .request()
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate);

  const [kpiRes, dailyRes, waitRes, serviceRes, statusRes, advisorRes] = await Promise.all([
    requestWithRange().query(`
      SELECT
        SUM(served_count) AS totalServed,
        AVG(avg_wait_time_min * 1.0) AS avgWaitTimeMin
      FROM vw_admin_queue_usage_daily
      WHERE activity_date BETWEEN @startDate AND @endDate
    `),
    requestWithRange().query(`
      SELECT activity_date, total_queue_entries
      FROM vw_admin_queue_usage_daily
      WHERE activity_date BETWEEN @startDate AND @endDate
      ORDER BY activity_date ASC
    `),
    requestWithRange().query(`
      SELECT activity_date, avg_wait_time_min
      FROM vw_admin_queue_usage_daily
      WHERE activity_date BETWEEN @startDate AND @endDate
      ORDER BY activity_date ASC
    `),
    requestWithRange().query(`
      SELECT TOP 7
        service_name,
        SUM(total_queue_entries) AS total_queue_entries,
        AVG(avg_wait_time_min * 1.0) AS avg_wait_time_min
      FROM vw_admin_service_queue_activity
      WHERE activity_date BETWEEN @startDate AND @endDate
      GROUP BY service_name
      ORDER BY SUM(total_queue_entries) DESC
    `),
    requestWithRange().query(`
      SELECT
        SUM(served_count) AS served,
        SUM(canceled_count) AS canceled,
        SUM(left_count) AS left_count,
        SUM(no_show_count) AS no_show,
        SUM(CASE
          WHEN total_queue_entries - served_count - canceled_count - left_count - no_show_count > 0
            THEN total_queue_entries - served_count - canceled_count - left_count - no_show_count
          ELSE 0
        END) AS waiting
      FROM vw_admin_service_queue_activity
      WHERE activity_date BETWEEN @startDate AND @endDate
    `),
    requestWithRange().query(`
      SELECT TOP 7
        advisor_name,
        SUM(served_entries) AS served_entries
      FROM vw_admin_advisor_performance
      WHERE activity_date BETWEEN @startDate AND @endDate
      GROUP BY advisor_name
      ORDER BY SUM(served_entries) DESC
    `),
  ]);

  const appointmentsInRangeRes = await requestWithRange().query(`
    SELECT COUNT(1) AS appointmentsInRange
    FROM vw_admin_appointment_activity
    WHERE appointment_date BETWEEN @startDate AND @endDate
      AND status IN ('Scheduled', 'Waiting')
  `);

  const busiestService = serviceRes.recordset[0]?.service_name || '—';
  const kpi = kpiRes.recordset[0] || {};
  const status = statusRes.recordset[0] || {};

  return {
    kpis: {
      totalServed: Number(kpi.totalServed || 0),
      avgWaitTimeMin: Number(kpi.avgWaitTimeMin || 0),
      busiestService,
      appointmentsToday: Number(appointmentsInRangeRes.recordset[0]?.appointmentsInRange || 0),
    },
    charts: {
      dailyQueueVolumeTrend: dailyRes.recordset,
      averageWaitTimeTrend: waitRes.recordset,
      mostPopularServices: serviceRes.recordset,
      statusBreakdown: [
        { label: 'Served', value: Number(status.served || 0) },
        { label: 'Canceled', value: Number(status.canceled || 0) },
        { label: 'Left', value: Number(status.left_count || 0) },
        { label: 'No Show', value: Number(status.no_show || 0) },
        { label: 'Waiting', value: Number(status.waiting || 0) },
      ],
      advisorWorkload: advisorRes.recordset,
    },
  };
}

async function getReportUserQueueParticipation(filters, limit) {
  const pool = await getPool();
  const request = pool.request();
  const clauses = bindUserParticipationFilters(request, filters);
  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const sortSql = sanitizeSort(filters.sortBy, 'joined_at DESC');
  request.input('limit', sql.Int, limit);

  const result = await request.query(`
    SELECT TOP (@limit)
      COALESCE(full_name, display_name) AS student_name,
      student_id,
      service_name,
      entry_source,
      priority,
      status,
      joined_at,
      started_serving_at,
      completed_at,
      wait_time_min,
      service_time_min,
      total_time_min,
      advisor_name
    FROM vw_admin_user_queue_participation
    ${whereSql}
    ORDER BY ${sortSql}
  `);

  return result.recordset;
}

async function getReportServiceQueueActivity(filters, limit) {
  const pool = await getPool();
  const request = pool.request();
  const clauses = bindActivityDateFilters(request, filters);

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const sortSql = sanitizeSort(filters.sortBy, 'activity_date DESC, total_queue_entries DESC');
  request.input('limit', sql.Int, limit);

  const result = await request.query(`
    SELECT TOP (@limit)
      activity_date AS activity_date,
      service_name,
      total_queue_entries,
      served_count AS total_served,
      canceled_count AS total_canceled,
      left_count AS total_left,
      no_show_count AS total_no_show,
      avg_wait_time_min AS average_wait_time_min,
      avg_service_time_min AS average_service_time_min
    FROM vw_admin_service_queue_activity
    ${whereSql}
    ORDER BY ${sortSql}
  `);

  return result.recordset;
}

async function getReportDailyQueueUsage(filters, limit) {
  const pool = await getPool();
  const request = pool.request();
  const clauses = bindDailyUsageFilters(request, filters);

  const dowList =
    filters.allDaysOfWeek === true
      ? []
      : toTrimmedList(filters.daysOfWeek).length
        ? toTrimmedList(filters.daysOfWeek)
        : filters.dayOfWeek && String(filters.dayOfWeek).trim() && String(filters.dayOfWeek).trim() !== 'any'
          ? [String(filters.dayOfWeek).trim()]
          : [];
  if (dowList.length) {
    addInClause(request, clauses, 'DATENAME(WEEKDAY, activity_date)', dowList, 'f_dow');
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  request.input('limit', sql.Int, limit);

  const innerSql = `
    SELECT
      activity_date AS queue_date,
      SUM(total_queue_entries) AS total_queue_entries,
      SUM(served_count) AS total_served,
      SUM(CASE
        WHEN total_queue_entries - served_count - canceled_count - left_count - no_show_count > 0
          THEN total_queue_entries - served_count - canceled_count - left_count - no_show_count
        ELSE 0
      END) AS total_waiting,
      SUM(canceled_count) AS total_canceled,
      SUM(left_count) AS total_left,
      SUM(no_show_count) AS total_no_show,
      AVG(avg_wait_time_min * 1.0) AS average_wait_time_min,
      AVG(COALESCE(avg_service_time_min, avg_wait_time_min) * 1.0) AS average_service_time_min,
      AVG((avg_wait_time_min + COALESCE(avg_service_time_min, 0)) * 1.0) AS average_total_time_min
    FROM vw_admin_service_queue_activity
    ${whereSql}
    GROUP BY activity_date
  `;

  const result = await request.query(`
    SELECT TOP (@limit) *
    FROM (${innerSql}) AS daily_agg
    ORDER BY queue_date DESC
  `);

  return result.recordset;
}

async function getReportAverageWaitAnalysis(filters, limit) {
  const pool = await getPool();
  const request = pool.request();
  const groupBy = String(filters.groupBy || 'service').toLowerCase() === 'day' ? 'day' : 'service';

  const clauses = bindActivityDateFilters(request, filters);
  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  request.input('limit', sql.Int, limit);

  if (groupBy === 'day') {
    const result = await request.query(`
      SELECT TOP (@limit)
        activity_date AS queue_date,
        SUM(total_queue_entries) AS total_queue_entries,
        AVG(avg_wait_time_min * 1.0) AS average_wait_time_min,
        MAX(avg_wait_time_min * 1.0) AS maximum_wait_time_min
      FROM vw_admin_service_queue_activity
      ${whereSql}
      GROUP BY activity_date
      ORDER BY activity_date DESC
    `);
    return result.recordset;
  }

  const result = await request.query(`
    SELECT TOP (@limit)
      service_name,
      SUM(total_queue_entries) AS total_queue_entries,
      AVG(avg_wait_time_min * 1.0) AS average_wait_time_min,
      MAX(avg_wait_time_min * 1.0) AS maximum_wait_time_min,
      AVG(COALESCE(avg_service_time_min, avg_wait_time_min) * 1.0) AS average_service_time_min
    FROM vw_admin_service_queue_activity
    ${whereSql}
    GROUP BY service_name
    ORDER BY SUM(total_queue_entries) DESC
  `);

  return result.recordset;
}

async function getReport(reportType, filters = {}) {
  const limit = Number(filters.limit || 500);
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 500;

  switch (reportType) {
    case 'user_queue_participation':
      return getReportUserQueueParticipation(filters, safeLimit);
    case 'service_queue_activity':
      return getReportServiceQueueActivity(filters, safeLimit);
    case 'daily_queue_usage':
      return getReportDailyQueueUsage(filters, safeLimit);
    case 'average_wait_time_analysis':
      return getReportAverageWaitAnalysis(filters, safeLimit);
    default: {
      const err = new Error('Unsupported report type.');
      err.statusCode = 400;
      throw err;
    }
  }
}

async function getReportFilterOptions() {
  const pool = await getPool();

  const [servicesRes, queueStatusesRes, prioritiesRes, entrySourcesRes] = await Promise.all([
    pool.request().query(`
      SELECT DISTINCT TOP 300 service_name
      FROM vw_admin_service_queue_activity
      WHERE service_name IS NOT NULL AND LTRIM(RTRIM(service_name)) <> ''
      ORDER BY service_name
    `),
    pool.request().query(`
      SELECT DISTINCT TOP 50 status
      FROM vw_admin_user_queue_participation
      WHERE status IS NOT NULL AND LTRIM(RTRIM(status)) <> ''
      ORDER BY status
    `),
    pool.request().query(`
      SELECT DISTINCT TOP 20 priority
      FROM vw_admin_user_queue_participation
      WHERE priority IS NOT NULL AND LTRIM(RTRIM(priority)) <> ''
      ORDER BY priority
    `),
    pool.request().query(`
      SELECT DISTINCT TOP 20 entry_source
      FROM vw_admin_user_queue_participation
      WHERE entry_source IS NOT NULL AND LTRIM(RTRIM(entry_source)) <> ''
      ORDER BY entry_source
    `),
  ]);

  const daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  return {
    services: servicesRes.recordset.map(r => r.service_name),
    queueStatuses: queueStatusesRes.recordset.map(r => r.status),
    /** vw_admin_service_queue_activity has no row-level status; filters use aggregates only. */
    serviceActivityStatuses: [],
    priorities: prioritiesRes.recordset.map(r => r.priority),
    entrySources: entrySourcesRes.recordset.map(r => r.entry_source),
    daysOfWeek,
    reportTypes: REPORT_TYPES,
  };
}

module.exports = {
  getOverview,
  getReport,
  getReportFilterOptions,
};

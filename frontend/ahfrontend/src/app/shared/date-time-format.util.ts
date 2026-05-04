function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (dateOnly) {
      const year = Number(dateOnly[1]);
      const monthIndex = Number(dateOnly[2]) - 1;
      const day = Number(dateOnly[3]);
      const d = new Date(year, monthIndex, day);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatDateMMDDYYYY(value: unknown): string {
  const d = toDate(value);
  if (!d) return String(value ?? '—');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}-${day}-${year}`;
}

export function formatTimeHHMM(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'string' && /^\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value)) {
    const [hourRaw, minuteRaw] = value.split(':');
    const hour24 = Number(hourRaw);
    const minute = Number(minuteRaw);
    if (!Number.isNaN(hour24) && !Number.isNaN(minute)) {
      const suffix = hour24 >= 12 ? 'PM' : 'AM';
      const hour12 = hour24 % 12 || 12;
      return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
    }
    return value.slice(0, 5);
  }
  const d = toDate(value);
  if (!d) return String(value);
  const hour24 = d.getHours();
  const minute = d.getMinutes();
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function formatDateTimeMMDDYYYYHHMM(value: unknown): string {
  if (value == null || value === '') return '—';
  const d = toDate(value);
  if (!d) return String(value);
  return `${formatDateMMDDYYYY(d)} ${formatTimeHHMM(d)}`;
}


function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
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
    return value.slice(0, 5);
  }
  const d = toDate(value);
  if (!d) return String(value);
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

export function formatDateTimeMMDDYYYYHHMM(value: unknown): string {
  if (value == null || value === '') return '—';
  const d = toDate(value);
  if (!d) return String(value);
  return `${formatDateMMDDYYYY(d)} ${formatTimeHHMM(d)}`;
}


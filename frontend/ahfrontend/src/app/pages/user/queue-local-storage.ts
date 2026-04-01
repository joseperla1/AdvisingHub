/** Single source of truth for client-side queue state until the backend owns it. */

export const LS_ACTIVE_TICKET = 'ah_activeTicket';
export const LS_TICKET_HISTORY = 'ah_ticketHistory';

/** Shape written by join-queue and read everywhere else. */
export interface StoredQueueTicket {
  ticketId: string;
  serviceId: string;
  serviceName: string;
  notes?: string;
  status: string;
  position: number;
  estimatedWaitMins: number;
  createdAtISO: string;
  updatedAtISO: string;
}

/** Normalized row for History page (`joinedAt` / `endedAt` match its loader). */
export interface HistoryRecord {
  id: string;
  serviceName: string;
  status: string;
  outcome: 'served' | 'left' | 'canceled' | 'no_show';
  position: number | null;
  estWaitMin: number | null;
  joinedAt: string;
  endedAt: string;
}

export function readStoredActiveTicket(): StoredQueueTicket | null {
  try {
    const raw = localStorage.getItem(LS_ACTIVE_TICKET);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<StoredQueueTicket> | null;
    if (!p || typeof p !== 'object') return null;
    const ticketId = p.ticketId ?? (p as { id?: string }).id;
    if (!ticketId || !p.serviceName) return null;
    return {
      ticketId: String(ticketId),
      serviceId: String(p.serviceId ?? ''),
      serviceName: String(p.serviceName),
      notes: p.notes,
      status: String(p.status ?? 'waiting'),
      position: typeof p.position === 'number' ? p.position : Number(p.position) || 0,
      estimatedWaitMins:
        typeof p.estimatedWaitMins === 'number'
          ? p.estimatedWaitMins
          : Number(p.estimatedWaitMins) ||
            Number((p as { estWaitMin?: number }).estWaitMin) ||
            0,
      createdAtISO: String(
        p.createdAtISO ??
          (p as { joinedAtIso?: string }).joinedAtIso ??
          new Date().toISOString()
      ),
      updatedAtISO: String(p.updatedAtISO ?? p.createdAtISO ?? new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

export function clearStoredActiveTicket(): void {
  localStorage.removeItem(LS_ACTIVE_TICKET);
  localStorage.removeItem('activeTicket');
  localStorage.removeItem('ah_activeTicket_simple');
}

export function readTicketHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(LS_TICKET_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as HistoryRecord[];
  } catch {
    return [];
  }
}

export function appendHistoryRecord(rec: HistoryRecord): void {
  const history = readTicketHistory();
  history.unshift({
    id: rec.id,
    serviceName: rec.serviceName,
    status: rec.status,
    outcome: rec.outcome,
    position: rec.position,
    estWaitMin: rec.estWaitMin,
    joinedAt: rec.joinedAt,
    endedAt: rec.endedAt,
  });
  localStorage.setItem(LS_TICKET_HISTORY, JSON.stringify(history.slice(0, 50)));
}

/** Call when user leaves queue: persist history and clear active ticket. */
export function leaveQueueAndRecordHistory(outcome: 'left' | 'canceled' = 'left'): void {
  const t = readStoredActiveTicket();
  if (!t) {
    clearStoredActiveTicket();
    return;
  }
  const ended = new Date().toISOString();
  appendHistoryRecord({
    id: t.ticketId,
    serviceName: t.serviceName,
    status: 'left',
    outcome,
    position: t.position,
    estWaitMin: t.estimatedWaitMins,
    joinedAt: t.createdAtISO,
    endedAt: ended,
  });
  clearStoredActiveTicket();
}

/** Clear queue session data (logout / full reset). */
export function clearAllQueueLocalState(): void {
  clearStoredActiveTicket();
  localStorage.removeItem(LS_TICKET_HISTORY);
}

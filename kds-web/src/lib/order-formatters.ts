/** Shared time/name formatting helpers used by both orders and tasks features. */

export function parseApiTimestamp(timestamp: string): Date {
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(timestamp)) {
    return new Date(timestamp);
  }
  return new Date(`${timestamp}Z`);
}

export function getElapsedMinutes(now: number, timestamp: string): number {
  const start = parseApiTimestamp(timestamp).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.floor((now - start) / 60000);
}

export function normalizeAssignedMenuName(value: string): string {
  return value.trim().toLowerCase().split(/\s+/).join(" ");
}

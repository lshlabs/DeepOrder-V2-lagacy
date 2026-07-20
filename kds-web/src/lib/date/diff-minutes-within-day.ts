import type { Dayjs } from "dayjs";

export function diffMinutesWithinDay(start: Dayjs, end: Dayjs) {
  const startMinutes = start.hour() * 60 + start.minute();
  const endMinutes = end.hour() * 60 + end.minute();
  const diff = endMinutes - startMinutes;
  return diff > 0 ? diff : diff + 24 * 60;
}

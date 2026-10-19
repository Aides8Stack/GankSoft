import { calendarDay } from "./calendar.ts";
export function validDateRange(start: string, end: string): boolean {
  const valid = (s: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !Number.isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s;
  return valid(start) && valid(end) && start <= end;
}
/** Inclusive study-calendar days; avoids excluding the final date after midnight. */
export function inDateRange(
  iso: string,
  start: string,
  end: string,
  timeZone: string,
): boolean {
  if (!validDateRange(start, end) || Number.isNaN(Date.parse(iso)))
    return false;
  const day = calendarDay(new Date(iso), timeZone);
  return day >= start && day <= end;
}

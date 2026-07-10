/** Team home timezone for all fan-facing date logic. */
export const TEAM_TIMEZONE = "America/Indiana/Indianapolis";

export function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Calendar day key `YYYY-MM-DD` in the given IANA timezone. */
export function calendarDayKey(
  value: Date | string,
  timeZone: string = TEAM_TIMEZONE,
): string {
  const d = toDate(value);
  // en-CA yields YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function isSameCalendarDay(
  a: Date | string,
  b: Date | string,
  timeZone: string = TEAM_TIMEZONE,
): boolean {
  return calendarDayKey(a, timeZone) === calendarDayKey(b, timeZone);
}

/** True if `value`'s calendar day is on or after `now`'s calendar day in team TZ. */
export function isOnOrAfterToday(
  value: Date | string,
  now: Date | string = new Date(),
  timeZone: string = TEAM_TIMEZONE,
): boolean {
  return calendarDayKey(value, timeZone) >= calendarDayKey(now, timeZone);
}

/** True if `value`'s calendar day is strictly before `now`'s calendar day in team TZ. */
export function isBeforeToday(
  value: Date | string,
  now: Date | string = new Date(),
  timeZone: string = TEAM_TIMEZONE,
): boolean {
  return calendarDayKey(value, timeZone) < calendarDayKey(now, timeZone);
}

export function formatInTeamTz(
  value: Date | string,
  options: Intl.DateTimeFormatOptions,
  timeZone: string = TEAM_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(
    toDate(value),
  );
}

/** e.g. "Today · 6:00 PM" or "Mar 12" */
export function formatGameDayBadge(
  gameDate: Date | string,
  now: Date | string = new Date(),
  timeZone: string = TEAM_TIMEZONE,
): string {
  if (isSameCalendarDay(gameDate, now, timeZone)) {
    const time = formatInTeamTz(gameDate, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }, timeZone);
    return `Today · ${time}`;
  }
  return formatInTeamTz(gameDate, { month: "short", day: "numeric" }, timeZone);
}

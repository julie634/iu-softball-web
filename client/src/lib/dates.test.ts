import { describe, expect, it } from "vitest";
import {
  calendarDayKey,
  formatGameDayBadge,
  formatInTeamTz,
  formatKickoffDateTime,
  formatKickoffTime,
  isBeforeToday,
  isOnOrAfterToday,
  isSameCalendarDay,
  TEAM_TIMEZONE,
} from "./dates";

describe("calendarDayKey / Indianapolis", () => {
  it("uses America/Indiana/Indianapolis calendar day", () => {
    // 2026-04-15 02:00 UTC = still April 14 evening in Indianapolis (EDT, UTC-4)
    const lateUtc = new Date("2026-04-15T02:00:00.000Z");
    expect(calendarDayKey(lateUtc, TEAM_TIMEZONE)).toBe("2026-04-14");

    // 2026-04-15 12:00 UTC = April 15 morning in Indianapolis
    const middayUtc = new Date("2026-04-15T12:00:00.000Z");
    expect(calendarDayKey(middayUtc, TEAM_TIMEZONE)).toBe("2026-04-15");
  });

  it("isSameCalendarDay across UTC boundary", () => {
    const a = "2026-04-15T02:00:00.000Z"; // Indy Apr 14
    const b = "2026-04-14T22:00:00.000Z"; // Indy Apr 14
    expect(isSameCalendarDay(a, b)).toBe(true);
  });

  it("isOnOrAfterToday / isBeforeToday at midnight boundary", () => {
    const now = new Date("2026-04-15T12:00:00.000Z"); // Indy Apr 15
    const todayGame = "2026-04-15T23:00:00.000Z"; // still Apr 15 Indy
    const yesterdayGame = "2026-04-14T18:00:00.000Z";
    const tomorrowGame = "2026-04-16T18:00:00.000Z";

    expect(isOnOrAfterToday(todayGame, now)).toBe(true);
    expect(isOnOrAfterToday(tomorrowGame, now)).toBe(true);
    expect(isOnOrAfterToday(yesterdayGame, now)).toBe(false);
    expect(isBeforeToday(yesterdayGame, now)).toBe(true);
    expect(isBeforeToday(todayGame, now)).toBe(false);
  });

  it("formatGameDayBadge shows Today with Indianapolis time", () => {
    const now = new Date("2026-04-15T16:00:00.000Z");
    const game = "2026-04-15T22:00:00.000Z"; // 6:00 PM EDT
    const badge = formatGameDayBadge(game, now);
    expect(badge).toBe("Today · 6:00 PM");
  });

  it("formats 17:00Z kickoffs as 1:00 PM Indianapolis, not the browser zone", () => {
    const kickoff = "2026-09-13T17:00:00.000Z";
    expect(formatKickoffTime(kickoff)).toBe("1:00 PM");
    expect(formatKickoffDateTime(kickoff)).toBe("Sunday, Sep 13 · 1:00 PM");
    expect(formatGameDayBadge(kickoff, new Date("2026-09-11T16:00:00.000Z"))).toBe(
      "Sep 13 · 1:00 PM",
    );
    expect(
      formatInTeamTz(kickoff, { hour: "numeric", minute: "2-digit", hour12: true }),
    ).toBe("1:00 PM");
  });
});

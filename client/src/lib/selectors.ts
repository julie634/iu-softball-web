import type { Game } from "@/lib/supabase";
import {
  calendarDayKey,
  isBeforeToday,
  isOnOrAfterToday,
  isSameCalendarDay,
} from "@/lib/dates";

export type TeamRecord = {
  wins: number;
  losses: number;
  confWins: number;
  confLosses: number;
};

export type SeasonState = "in-season" | "postseason" | "offseason" | "fall-ball";

export type PartitionedGames = {
  upcoming: Game[];
  resultPending: Game[];
  completed: Game[];
  other: Game[];
};

const POSTSEASON_RE =
  /ncaa|regionals?|super\s*regionals?|wcws|world series|postseason/i;

const FALL_BALL_RE =
  /fall\s*ball|exhibition|scrimmage|alumni|intrasquad|intra-squad/i;

/** Indianapolis calendar window when D1 softball is in fall ball, not spring season. */
export const FALL_BALL_WINDOW = { startMd: "08-15", endMd: "11-15" } as const;

export function isPostseasonGame(game: Game): boolean {
  return Boolean(game.tournament_name && POSTSEASON_RE.test(game.tournament_name));
}

export function isInFallBallWindow(now: Date = new Date()): boolean {
  const md = calendarDayKey(now).slice(5);
  return md >= FALL_BALL_WINDOW.startMd && md <= FALL_BALL_WINDOW.endMd;
}

/** Exhibition / fall games must not count toward the official spring record. */
export function isFallBallGame(game: Game): boolean {
  const haystack = `${game.tournament_name ?? ""} ${game.notes ?? ""}`;
  if (FALL_BALL_RE.test(haystack)) return true;
  if (isPostseasonGame(game)) return false;
  const month = Number(calendarDayKey(game.date).slice(5, 7));
  return month >= 8 && month <= 11;
}

export function officialGames(games: readonly Game[]): Game[] {
  return games.filter((g) => !isFallBallGame(g));
}

export function fallBallGames(games: readonly Game[]): Game[] {
  return games.filter(isFallBallGame);
}

export function hasUsableScores(game: Game): boolean {
  return game.iu_score != null && game.opponent_score != null;
}

/** True W-L from completed games with both scores present. Equal scores are ignored (softball has no ties). */
export function computeRecord(games: readonly Game[]): TeamRecord {
  let wins = 0;
  let losses = 0;
  let confWins = 0;
  let confLosses = 0;

  for (const g of games) {
    if (isFallBallGame(g)) continue;
    if (g.status !== "completed" || !hasUsableScores(g)) continue;
    const iu = g.iu_score as number;
    const opp = g.opponent_score as number;
    if (iu > opp) {
      wins += 1;
      if (g.is_conference_game) confWins += 1;
    } else if (iu < opp) {
      losses += 1;
      if (g.is_conference_game) confLosses += 1;
    }
  }

  return { wins, losses, confWins, confLosses };
}

export function formatRecord(record: TeamRecord): string {
  return `${record.wins}-${record.losses}`;
}

/**
 * Upcoming = status upcoming|live AND calendar day >= today (Indianapolis).
 * Result pending = status upcoming|live AND calendar day < today.
 * Completed = status completed.
 * Other = postponed|canceled.
 */
export function partitionGames(
  games: readonly Game[],
  now: Date = new Date(),
): PartitionedGames {
  const upcoming: Game[] = [];
  const resultPending: Game[] = [];
  const completed: Game[] = [];
  const other: Game[] = [];

  for (const g of games) {
    if (g.status === "completed") {
      completed.push(g);
      continue;
    }
    if (g.status === "postponed" || g.status === "canceled") {
      other.push(g);
      continue;
    }
    if (g.status === "upcoming" || g.status === "live") {
      if (isOnOrAfterToday(g.date, now)) {
        upcoming.push(g);
      } else if (isBeforeToday(g.date, now)) {
        resultPending.push(g);
      } else {
        upcoming.push(g);
      }
      continue;
    }
    other.push(g);
  }

  upcoming.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  resultPending.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  completed.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return { upcoming, resultPending, completed, other };
}

export function getNextGame(
  games: readonly Game[],
  now: Date = new Date(),
): Game | undefined {
  const live = games
    .filter((g) => g.status === "live")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (live[0]) return live[0];
  return partitionGames(games, now).upcoming[0];
}

export function getLastCompletedGame(
  games: readonly Game[],
): Game | undefined {
  return partitionGames(games).completed[0];
}

/**
 * Season state from schedule data:
 * - fall-ball: Aug 15–Nov 15 (Indianapolis), or an active fall/exhibition slate
 * - offseason: before first official game day, after last official game day, or all terminal
 * - postseason: today falls in a postseason tournament window (by tournament_name)
 * - in-season: otherwise between first and last official scheduled game
 */
export function getSeasonState(
  games: readonly Game[],
  now: Date = new Date(),
): SeasonState {
  if (isInFallBallWindow(now)) return "fall-ball";

  const spring = officialGames(games);
  if (!spring.length) {
    const fall = fallBallGames(games);
    if (!fall.length) return "offseason";
    const fallDays = fall.map((g) => calendarDayKey(g.date)).sort();
    const today = calendarDayKey(now);
    const fallOpen = fall.some((g) => g.status === "upcoming" || g.status === "live");
    if (
      today >= fallDays[0]! &&
      (today <= fallDays[fallDays.length - 1]! || fallOpen)
    ) {
      return "fall-ball";
    }
    return "offseason";
  }

  const days = spring.map((g) => calendarDayKey(g.date)).sort();
  const firstDay = days[0]!;
  const lastDay = days[days.length - 1]!;
  const today = calendarDayKey(now);

  if (today < firstDay || today > lastDay) {
    return "offseason";
  }

  const stillOpen = spring.some(
    (g) => g.status === "upcoming" || g.status === "live",
  );
  if (!stillOpen && today >= lastDay) {
    return "offseason";
  }

  const postGames = spring.filter(isPostseasonGame);
  if (postGames.length > 0) {
    const postDays = postGames.map((g) => calendarDayKey(g.date)).sort();
    const firstPost = postDays[0]!;
    const lastPost = postDays[postDays.length - 1]!;
    const postOpen = postGames.some(
      (g) => g.status === "upcoming" || g.status === "live",
    );
    if (today >= firstPost && (today <= lastPost || postOpen)) {
      return "postseason";
    }
  }

  return "in-season";
}

/** Show Live nav when a game is live or scheduled today (Indianapolis). */
export function shouldShowLiveNav(
  games: readonly Game[],
  now: Date = new Date(),
): boolean {
  return games.some((g) => {
    if (g.status === "live") return true;
    if (g.status === "upcoming" && isSameCalendarDay(g.date, now)) return true;
    return false;
  });
}

export function completedResultLabel(game: Game): {
  kind: "win" | "loss" | "unavailable";
  text: string;
} {
  if (!hasUsableScores(game)) {
    return { kind: "unavailable", text: "Final — score unavailable" };
  }
  const iu = game.iu_score as number;
  const opp = game.opponent_score as number;
  if (iu > opp) {
    return { kind: "win", text: `W ${iu}-${opp}` };
  }
  if (iu < opp) {
    return { kind: "loss", text: `L ${iu}-${opp}` };
  }
  return { kind: "unavailable", text: "Final — score unavailable" };
}

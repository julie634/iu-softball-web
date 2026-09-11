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

export type SeasonState = "in-season" | "postseason" | "offseason";

export type PartitionedGames = {
  upcoming: Game[];
  resultPending: Game[];
  completed: Game[];
  other: Game[];
};

const POSTSEASON_RE =
  /ncaa|regionals?|super\s*regionals?|wcws|world series|postseason/i;

const FALL_BALL_RE = /fall\s*ball/i;
const INNINGS_NOTE_RE = /(\d+)\s*-?\s*innings?/i;
const DOUBLEHEADER_RE = /doubleheader|\bDH\b/i;

export function isPostseasonGame(game: Game): boolean {
  return Boolean(game.tournament_name && POSTSEASON_RE.test(game.tournament_name));
}

/** Official Fall Ball exhibitions, identified only by tournament_name. */
export function isFallBallGame(game: Game): boolean {
  return Boolean(game.tournament_name && FALL_BALL_RE.test(game.tournament_name));
}

/** e.g. "10 innings" when notes mention an inning count. Does not invent a default. */
export function fallBallInningsLabel(game: Game): string | null {
  if (!game.notes) return null;
  const match = game.notes.match(INNINGS_NOTE_RE);
  return match ? `${match[1]} innings` : null;
}

/** Doubleheader cue from tournament_name or notes. Does not invent a game-2 time. */
export function isDoubleheaderGame(game: Game): boolean {
  return DOUBLEHEADER_RE.test(`${game.tournament_name ?? ""} ${game.notes ?? ""}`);
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
 * - offseason: before first game day, after last game day, or all terminal with no remaining play
 * - postseason: today falls in a postseason tournament window (by tournament_name)
 * - in-season: otherwise between first and last scheduled game
 */
export function getSeasonState(
  games: readonly Game[],
  now: Date = new Date(),
): SeasonState {
  if (!games.length) return "offseason";

  const days = games
    .map((g) => calendarDayKey(g.date))
    .sort();
  const firstDay = days[0]!;
  const lastDay = days[days.length - 1]!;
  const today = calendarDayKey(now);

  if (today < firstDay || today > lastDay) {
    return "offseason";
  }

  const stillOpen = games.some(
    (g) => g.status === "upcoming" || g.status === "live",
  );
  if (!stillOpen && today >= lastDay) {
    return "offseason";
  }

  const postGames = games.filter(isPostseasonGame);
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

/**
 * Show Live nav when a non-exhibition game is live or scheduled today
 * (Indianapolis). Fall Ball-only days stay off the NCAA 2025 board — results
 * belong on Schedule.
 */
export function shouldShowLiveNav(
  games: readonly Game[],
  now: Date = new Date(),
): boolean {
  return games.some((g) => {
    if (isFallBallGame(g)) return false;
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

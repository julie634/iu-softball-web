import { calendarDayKey } from "@/lib/dates";

export const ESPN_IU_TEAM_ID = "648";

export type ScoreboardGameState = "pre" | "live" | "final";

export interface ScoreboardTeam {
  id: string;
  shortName: string;
  fullName: string;
  score: number;
  winner: boolean;
  rank: string;
  record: string;
  conferenceName: string;
  conferenceSeo: string;
  isIU: boolean;
}

export interface ScoreboardGame {
  id: string;
  state: ScoreboardGameState;
  startTime: string;
  startEpoch: number;
  period: string;
  finalMessage: string;
  network: string;
  contestName: string;
  away: ScoreboardTeam;
  home: ScoreboardTeam;
}

interface EspnCompetitor {
  homeAway?: string;
  score?: string | { value?: string | number; displayValue?: string };
  winner?: boolean;
  curatedRank?: { current?: number | string };
  records?: Array<{ type?: string; summary?: string }>;
  team?: {
    id?: string;
    displayName?: string;
    shortDisplayName?: string;
    abbreviation?: string;
    conferenceId?: string;
  };
}

interface EspnEvent {
  id?: string;
  date?: string;
  name?: string;
  shortName?: string;
  competitions?: Array<{
    date?: string;
    conferenceCompetition?: boolean;
    notes?: Array<{ headline?: string }>;
    broadcasts?: Array<{ names?: string[] }>;
    status?: {
      type?: {
        state?: string;
        completed?: boolean;
        detail?: string;
        shortDetail?: string;
      };
      period?: number;
      displayClock?: string;
    };
    competitors?: EspnCompetitor[];
  }>;
}

const CONFERENCE_BY_ID: Record<string, { name: string; seo: string }> = {
  "2": { name: "ACC", seo: "acc" },
  "4": { name: "Big 12", seo: "big-12" },
  "7": { name: "Big Ten", seo: "big-ten" },
  "8": { name: "SEC", seo: "sec" },
  "9": { name: "Pac-12", seo: "pac-12" },
};

function readScore(value: EspnCompetitor["score"]): number {
  if (value == null) return 0;
  if (typeof value === "object") {
    const raw = value.value ?? value.displayValue ?? 0;
    return Number.parseInt(String(raw), 10) || 0;
  }
  return Number.parseInt(String(value), 10) || 0;
}

function mapState(state?: string, completed?: boolean): ScoreboardGameState {
  if (completed || state === "post") return "final";
  if (state === "in") return "live";
  return "pre";
}

function mapTeam(comp: EspnCompetitor): ScoreboardTeam {
  const id = String(comp.team?.id ?? "");
  const conference = CONFERENCE_BY_ID[comp.team?.conferenceId ?? ""] ?? {
    name: "",
    seo: "",
  };
  const overall =
    comp.records?.find((r) => r.type === "total" || r.type === "overall")
      ?.summary ?? "";
  return {
    id,
    shortName:
      comp.team?.shortDisplayName ||
      comp.team?.abbreviation ||
      comp.team?.displayName ||
      "TBD",
    fullName: comp.team?.displayName || "TBD",
    score: readScore(comp.score),
    winner: Boolean(comp.winner),
    rank: comp.curatedRank?.current != null ? String(comp.curatedRank.current) : "",
    record: overall,
    conferenceName: conference.name,
    conferenceSeo: conference.seo,
    isIU: id === ESPN_IU_TEAM_ID,
  };
}

export function espnScoreboardDateKey(date: Date): string {
  return calendarDayKey(date).replaceAll("-", "");
}

export function mapEspnScoreboard(payload: { events?: EspnEvent[] }): ScoreboardGame[] {
  return (payload.events ?? []).flatMap((event) => {
    const competition = event.competitions?.[0];
    if (!competition) return [];
    const awayRaw = competition.competitors?.find((c) => c.homeAway === "away");
    const homeRaw = competition.competitors?.find((c) => c.homeAway === "home");
    if (!awayRaw || !homeRaw) return [];

    const status = competition.status;
    const state = mapState(status?.type?.state, status?.type?.completed);
    const start = new Date(competition.date || event.date || Date.now());
    const network = competition.broadcasts?.flatMap((b) => b.names ?? [])[0] ?? "";
    const periodParts = [status?.type?.shortDetail, status?.displayClock].filter(
      Boolean,
    );

    return [
      {
        id: String(event.id ?? `${event.shortName}-${event.date}`),
        state,
        startTime: start.toLocaleTimeString("en-US", {
          timeZone: "America/Indiana/Indianapolis",
          hour: "numeric",
          minute: "2-digit",
        }),
        startEpoch: start.getTime(),
        period: periodParts.join(" · "),
        finalMessage: status?.type?.detail || "FINAL",
        network,
        contestName: competition.notes?.[0]?.headline || event.name || "",
        away: mapTeam(awayRaw),
        home: mapTeam(homeRaw),
      },
    ];
  });
}

export async function fetchEspnScoreboard(date: Date): Promise<ScoreboardGame[]> {
  const dates = espnScoreboardDateKey(date);
  const url = `https://site.api.espn.com/apis/site/v2/sports/baseball/college-softball/scoreboard?dates=${dates}&limit=300`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`ESPN scoreboard error: ${res.status}`);
  }
  return mapEspnScoreboard(await res.json());
}

export function isIUScoreboardGame(game: ScoreboardGame): boolean {
  return game.away.isIU || game.home.isIU;
}

// update-scores Edge Function for IU Softball Fan Hub
// Uses ESPN site API (not cdn.espn.com — that returns a bot challenge HTML from Supabase IPs).
//
// Endpoint:
//   https://site.api.espn.com/apis/site/v2/sports/baseball/college-softball/teams/648/schedule?season=YYYY
// Note: sport path is "baseball" — ESPN files college softball under baseball; "softball" returns 400.
//
// Season label = year of season end (WCWS ~May/June). 2026 season ≈ June 2025–June 2026.
// Schedule: Every 30 minutes via pg_cron
//
// Last updated: July 10, 2026

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ESPN_TEAM_ID = "648"; // Indiana Hoosiers Softball
const ESPN_UA = "Mozilla/5.0 (compatible; IUSoftballFanHub/1.0)";

type EspnScore =
  | string
  | number
  | { value?: number | string; displayValue?: string }
  | null
  | undefined;

interface ESPNCompetitor {
  team: {
    id: string;
    displayName: string;
    logo?: string;
    logos?: Array<{ href: string }>;
  };
  score?: EspnScore;
  winner?: boolean;
  homeAway: "home" | "away";
  records?: Array<{ summary: string; type: string }>;
}

interface ESPNEvent {
  id: string;
  date: string;
  name: string;
  competitions: Array<{
    competitors: ESPNCompetitor[];
    venue?: {
      fullName?: string;
      address?: { city?: string; state?: string };
    };
    status?: {
      type?: {
        completed?: boolean;
        description?: string;
        state?: string;
        name?: string;
      };
      period?: number;
      displayClock?: string;
    };
    conferenceCompetition?: boolean;
    broadcasts?: Array<{
      market?: { type?: string };
      names?: string[];
      media?: { shortName?: string };
    }>;
    notes?: Array<{ headline?: string; type?: string }>;
  }>;
  links?: Array<{ href: string; text?: string; rel?: string[] }>;
  status?: {
    type?: {
      completed?: boolean;
      description?: string;
      state?: string;
    };
    period?: number;
  };
}

/**
 * ESPN college-softball season id = calendar year when the season ends (WCWS).
 * Season S runs roughly June(S-1) / fall(S-1) through June(S).
 * Jul–Dec of year Y → season Y+1; Jan–Jun of year Y → season Y.
 */
export function espnSoftballSeasonYear(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1; // 1–12
  return m >= 7 ? y + 1 : y;
}

function parseOptionalScore(raw: EspnScore): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? Math.trunc(raw) : null;
  }
  if (typeof raw === "object") {
    if (raw.displayValue != null && raw.displayValue !== "") {
      const n = parseInt(String(raw.displayValue), 10);
      if (Number.isFinite(n)) return n;
    }
    if (raw.value != null && raw.value !== "") {
      const n = parseFloat(String(raw.value));
      if (Number.isFinite(n)) return Math.trunc(n);
    }
    return null;
  }
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : null;
}

function competitorId(c: ESPNCompetitor): string {
  return String(c.team?.id ?? "");
}

async function fetchEspnSchedule(season: number): Promise<ESPNEvent[]> {
  const url =
    `https://site.api.espn.com/apis/site/v2/sports/baseball/college-softball/teams/${ESPN_TEAM_ID}/schedule?season=${season}`;

  const espnResponse = await fetch(url, {
    headers: {
      "User-Agent": ESPN_UA,
      Accept: "application/json",
    },
  });

  // 202 from cdn was the bot wall; site.api should be 200 JSON
  if (!espnResponse.ok) {
    const snippet = (await espnResponse.text()).slice(0, 120);
    throw new Error(
      `ESPN schedule API error: ${espnResponse.status} (season=${season}) ${snippet}`,
    );
  }

  const contentType = espnResponse.headers.get("content-type") || "";
  let espnData: { events?: ESPNEvent[] };
  try {
    espnData = await espnResponse.json();
  } catch {
    throw new Error(
      `ESPN schedule response was not JSON (content-type=${contentType}, season=${season})`,
    );
  }

  if (!Array.isArray(espnData.events)) {
    throw new Error(
      `ESPN schedule missing events[] (season=${season})`,
    );
  }

  return espnData.events;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startedAt = new Date().toISOString();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Games needing attention:
    //    - upcoming / live (including today — not only past-dated)
    //    - completed rows still missing scores (backfill)
    const now = new Date();
    const nowIso = now.toISOString();
    const { data: pendingGames, error: gamesError } = await supabase
      .from("games")
      .select("id, date, opponent, status, iu_score, opponent_score")
      .or(
        "status.eq.upcoming,status.eq.live,and(status.eq.completed,iu_score.is.null),and(status.eq.completed,opponent_score.is.null)",
      )
      .order("date", { ascending: true });

    if (gamesError) throw gamesError;
    if (!pendingGames || pendingGames.length === 0) {
      await supabase.from("data_source_runs").insert({
        source: "update-scores",
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        status: "success",
        rows_parsed: 0,
        rows_written: 0,
        error_summary: null,
      });
      return new Response(
        JSON.stringify({
          message: "No games need score updates",
          checkedAt: nowIso,
          status: "success",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Fetch ESPN schedule for season year(s) covering pending games + "now"
    const seasonYears = new Set<number>();
    seasonYears.add(espnSoftballSeasonYear(now));
    for (const g of pendingGames) {
      seasonYears.add(espnSoftballSeasonYear(new Date(g.date)));
    }

    const espnGames: ESPNEvent[] = [];
    const seasonsFetched: number[] = [];
    for (const season of [...seasonYears].sort()) {
      const events = await fetchEspnSchedule(season);
      espnGames.push(...events);
      seasonsFetched.push(season);
    }

    // 3. Match ESPN events to our database games and update
    const updated: string[] = [];
    const skipped: string[] = [];
    const updateErrors: string[] = [];

    for (const game of pendingGames) {
      const gameDate = new Date(game.date);
      const gameMonth = gameDate.getUTCMonth() + 1;
      const gameDay = gameDate.getUTCDate();
      const opponentLower = game.opponent.toLowerCase().trim();

      const match = espnGames.find((eg) => {
        const comp = eg.competitions?.[0];
        if (!comp) return false;

        const espnDate = new Date(eg.date);
        const espnMonth = espnDate.getUTCMonth() + 1;
        const espnDay = espnDate.getUTCDate();
        if (espnMonth !== gameMonth || espnDay !== gameDay) return false;

        const iuTeam = comp.competitors?.find(
          (c) => competitorId(c) === ESPN_TEAM_ID,
        );
        if (!iuTeam) return false;

        const opponent = comp.competitors?.find(
          (c) => competitorId(c) !== ESPN_TEAM_ID,
        );
        if (!opponent) return false;

        const espnOppName = opponent.team?.displayName?.toLowerCase() || "";
        return (
          espnOppName.includes(opponentLower) ||
          opponentLower.includes(espnOppName) ||
          fuzzyMatch(opponentLower, espnOppName)
        );
      });

      if (!match) {
        skipped.push(
          `Game ${game.id}: ${game.opponent} on ${gameMonth}/${gameDay} - no ESPN match found`,
        );
        continue;
      }

      const comp = match.competitions[0];
      const iuTeam = comp.competitors.find(
        (c) => competitorId(c) === ESPN_TEAM_ID,
      )!;
      const oppTeam = comp.competitors.find(
        (c) => competitorId(c) !== ESPN_TEAM_ID,
      )!;

      // Completion status lives on competitions[0].status.type
      const espnStatus = comp.status?.type || match.status?.type || {};
      const isCompleted = espnStatus.completed === true;
      const isInProgress =
        espnStatus.state === "in" ||
        espnStatus.description === "In Progress" ||
        espnStatus.name === "STATUS_IN_PROGRESS";

      const iuScore = parseOptionalScore(iuTeam.score);
      const oppScore = parseOptionalScore(oppTeam.score);

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (isCompleted) {
        updateData.status = "completed";
        if (iuScore != null && oppScore != null) {
          updateData.iu_score = iuScore;
          updateData.opponent_score = oppScore;
        }
        const period = comp.status?.period ?? match.status?.period;
        if (period != null) {
          updateData.innings_played = String(period);
        }
      } else if (isInProgress) {
        updateData.status = "live";
        if (iuScore != null) updateData.iu_score = iuScore;
        if (oppScore != null) updateData.opponent_score = oppScore;
      }

      const oppLogo = oppTeam.team?.logo || oppTeam.team?.logos?.[0]?.href;
      if (oppLogo) {
        updateData.opponent_logo = oppLogo;
      }

      const broadcast =
        comp.broadcasts?.[0]?.names?.[0] ||
        comp.broadcasts?.[0]?.media?.shortName;
      if (broadcast) {
        updateData.broadcast_network = broadcast;
      }

      const oppRecord = oppTeam.records?.find(
        (r) => r.type === "total" || r.type === "overall",
      );
      if (oppRecord?.summary) {
        updateData.opponent_record = oppRecord.summary;
      }

      // site.api links use rel like ["now","desktop","event"] — use game page as box-score fallback
      const boxScoreLink =
        match.links?.find(
          (l) =>
            l.text?.toLowerCase().includes("box") ||
            l.rel?.includes("boxscore"),
        ) ||
        match.links?.find((l) => l.rel?.includes("event") && l.href);
      if (boxScoreLink?.href) {
        updateData.box_score_url = boxScoreLink.href;
      }

      if (comp.conferenceCompetition !== undefined) {
        updateData.is_conference_game = comp.conferenceCompetition;
      }

      if (isCompleted || isInProgress || Object.keys(updateData).length > 1) {
        const { error: updateError } = await supabase
          .from("games")
          .update(updateData)
          .eq("id", game.id);

        if (updateError) {
          updateErrors.push(
            `Game ${game.id}: ${game.opponent} - update error: ${updateError.message}`,
          );
        } else {
          const statusLabel = isCompleted
            ? iuScore != null && oppScore != null
              ? `Completed ${iuScore}-${oppScore}`
              : "Completed (score unavailable)"
            : isInProgress
            ? `Live ${iuScore ?? "?"}-${oppScore ?? "?"}`
            : "Metadata updated";
          updated.push(
            `Game ${game.id}: ${game.opponent} on ${gameMonth}/${gameDay} -> ${statusLabel}`,
          );
        }
      } else {
        skipped.push(
          `Game ${game.id}: ${game.opponent} on ${gameMonth}/${gameDay} - game not yet started on ESPN`,
        );
      }
    }

    const rowsParsed = pendingGames.length;
    const rowsWritten = updated.length;
    let runStatus: "success" | "partial" | "failure" = "success";
    if (updateErrors.length > 0 && rowsWritten === 0) runStatus = "failure";
    else if (updateErrors.length > 0) runStatus = "partial";
    else if (rowsWritten === 0 && skipped.length > 0) {
      // Matched nothing / only skips — treat as partial so we notice in health checks
      runStatus = "partial";
    }

    const errorSummary =
      updateErrors.slice(0, 15).join("; ") ||
      (rowsWritten === 0 && skipped.length > 0
        ? `No updates; ${skipped.length} skipped`
        : null);

    await supabase.from("data_source_runs").insert({
      source: "update-scores",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: runStatus,
      rows_parsed: rowsParsed,
      rows_written: rowsWritten,
      error_summary: errorSummary,
    });

    return new Response(
      JSON.stringify({
        message: `Checked ${pendingGames.length} pending games against ${espnGames.length} ESPN events`,
        status: runStatus,
        seasons: seasonsFetched,
        updated: updated.length,
        games: updated,
        skipped,
        updateErrors,
        checkedAt: nowIso,
        source: "ESPN site.api schedule",
      }),
      {
        status: runStatus === "failure" ? 500 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    await supabase.from("data_source_runs").insert({
      source: "update-scores",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: "failure",
      rows_parsed: 0,
      rows_written: 0,
      error_summary: (error as Error).message,
    });
    return new Response(
      JSON.stringify({ error: (error as Error).message, status: "failure" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

/**
 * Fuzzy match two team name strings.
 * Handles cases like "Maryland" vs "Maryland Terrapins" or abbreviations.
 */
function fuzzyMatch(a: string, b: string): boolean {
  const wordsA = a.split(/\s+/).filter((w) => w.length > 2);
  const wordsB = b.split(/\s+/).filter((w) => w.length > 2);

  for (const wordA of wordsA) {
    for (const wordB of wordsB) {
      if (
        wordA === wordB ||
        wordA.startsWith(wordB) ||
        wordB.startsWith(wordA)
      ) {
        return true;
      }
    }
  }
  return false;
}

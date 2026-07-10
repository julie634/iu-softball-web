// update-stats Edge Function for IU Softball Fan Hub
// Reads the IU Athletics stats page, parses batting stats from the HTML table
// and pitching stats from the embedded Nuxt JSON payload, then updates Supabase.
//
// Deploy: Supabase Dashboard > Edge Functions > update-stats > Replace code > Deploy
// Schedule: Every 30 minutes via pg_cron
//
// Last updated: March 22, 2026
// Parses SIDEARM Sports / Nuxt SSR HTML and embedded JSON payload

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startedAt = new Date().toISOString();
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch the IU Athletics stats page
    const statsUrl = "https://iuhoosiers.com/sports/softball/stats/2026";
    const response = await fetch(statsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; IUSoftballFanHub/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch stats page: " + response.status);
    }

    const html = await response.text();

    // 2. Get all players from the database to match by jersey number
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, number");

    if (playersError) throw playersError;

    // Build a lookup by jersey number
    const playerByJersey: Record<string, string> = {};
    for (const p of players || []) {
      playerByJersey[String(p.number)] = p.id;
    }

    // 3. Parse batting stats from the HTML table
    const battingStats = parseBattingFromHtml(html);

    // 4. Parse pitching stats from the embedded Nuxt JSON payload
    const pitchingStats = parsePitchingFromJson(html);

    // 5. Update batting stats in database
    let battingUpdated = 0;
    const battingErrors: string[] = [];
    for (const bat of battingStats) {
      const playerId = playerByJersey[bat.jersey];
      if (!playerId) continue;

      const { error } = await supabase
        .from("batting_stats")
        .upsert(
          {
            player_id: playerId,
            avg: bat.avg,
            ops: bat.ops,
            games_played: bat.gamesPlayed,
            games_started: bat.gamesStarted,
            at_bats: bat.atBats,
            runs: bat.runs,
            hits: bat.hits,
            doubles: bat.doubles,
            triples: bat.triples,
            home_runs: bat.homeRuns,
            rbi: bat.rbi,
            total_bases: bat.totalBases,
            slug_pct: bat.slugPct,
            walks: bat.walks,
            hit_by_pitch: bat.hitByPitch,
            strikeouts: bat.strikeouts,
            ob_pct: bat.obPct,
            stolen_bases: bat.stolenBases,
            stolen_base_attempts: bat.stolenBaseAttempts,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "player_id" }
        );

      if (error) battingErrors.push(`${bat.jersey}: ${error.message}`);
      else battingUpdated++;
    }

    // 6. Update pitching stats in database
    let pitchingUpdated = 0;
    const pitchingErrors: string[] = [];
    for (const pitch of pitchingStats) {
      const playerId = playerByJersey[pitch.jersey];
      if (!playerId) continue;

      // Map parser fields onto actual pitching_stats columns (see FIELD_MISMATCH_REPORT.md)
      const { error } = await supabase
        .from("pitching_stats")
        .upsert(
          {
            player_id: playerId,
            era: pitch.era,
            wins: pitch.wins,
            losses: pitch.losses,
            games_played: pitch.appearances,
            games_started: pitch.gamesStarted,
            complete_games: pitch.completeGames,
            shutouts: pitch.shutouts,
            saves: pitch.saves,
            innings_pitched: pitch.inningsPitched,
            hits: pitch.hitsAllowed,
            runs: pitch.runsAllowed,
            earned_runs: pitch.earnedRuns,
            walks: pitch.walksAllowed,
            strikeouts: pitch.strikeouts,
            opponent_avg: pitch.oppBattingAvg,
            whip: pitch.whip,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "player_id" }
        );

      if (error) {
        pitchingErrors.push(`${pitch.jersey}: ${error.message}`);
      } else {
        pitchingUpdated++;
      }
    }

    const rowsParsed = battingStats.length + pitchingStats.length;
    const rowsWritten = battingUpdated + pitchingUpdated;
    const hadParse = rowsParsed > 0;
    const writeFailed =
      (battingStats.length > 0 && battingUpdated === 0) ||
      (pitchingStats.length > 0 && pitchingUpdated === 0);
    const partial =
      (battingErrors.length > 0 || pitchingErrors.length > 0) &&
      rowsWritten > 0;
    let runStatus: "success" | "partial" | "failure" = "success";
    if (hadParse && rowsWritten === 0) runStatus = "failure";
    else if (partial || writeFailed) runStatus = rowsWritten > 0 ? "partial" : "failure";
    if (battingErrors.length || pitchingErrors.length) {
      if (rowsWritten === 0) runStatus = "failure";
      else runStatus = "partial";
    }

    const errorSummary = [...battingErrors, ...pitchingErrors]
      .slice(0, 20)
      .join("; ") || null;

    await supabase.from("data_source_runs").insert({
      source: "update-stats",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: runStatus,
      rows_parsed: rowsParsed,
      rows_written: rowsWritten,
      error_summary: errorSummary,
    });

    const body = {
      message: "Stats update complete",
      status: runStatus,
      batting: {
        parsed: battingStats.length,
        updated: battingUpdated,
        errors: battingErrors.length,
      },
      pitching: {
        parsed: pitchingStats.length,
        updated: pitchingUpdated,
        errors: pitchingErrors.length,
      },
      checkedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(body), {
      status: runStatus === "failure" ? 500 : 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from("data_source_runs").insert({
        source: "update-stats",
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        status: "failure",
        rows_parsed: 0,
        rows_written: 0,
        error_summary: (error as Error).message,
      });
    } catch {
      /* ignore logging failure */
    }
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ---- Batting Stats Parser (HTML Table) ----

interface BattingStat {
  jersey: string;
  name: string;
  avg: number;
  ops: number;
  gamesPlayed: number;
  gamesStarted: number;
  atBats: number;
  runs: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  totalBases: number;
  slugPct: number;
  walks: number;
  hitByPitch: number;
  strikeouts: number;
  obPct: number;
  stolenBases: number;
  stolenBaseAttempts: number;
}

function parseBattingFromHtml(html: string): BattingStat[] {
  const stats: BattingStat[] = [];

  // Match data rows in the stats table
  // Rows have class "s-table-body__row" and contain <td> cells
  const rowRegex = new RegExp(
    '<tr class="s-table-body__row[^"]*"[^>]*>(.*?)<\\/tr>',
    "gs"
  );

  let rowMatch;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];

    // Extract all <td> cell values
    const cellRegex = new RegExp("<td[^>]*>(.*?)<\\/td>", "gs");
    const cells: string[] = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      // Strip Vue comments and HTML tags to get clean text
      let text = cellMatch[1]
        .replace(/<!--.*?-->/g, "")
        .replace(/<[^>]+>/g, "")
        .trim();
      cells.push(text);
    }

    // Batting table has 22 columns:
    // 0: #, 1: Player, 2: AVG, 3: OPS, 4: GP-GS, 5: AB,
    // 6: R, 7: H, 8: 2B, 9: 3B, 10: HR, 11: RBI, 12: TB,
    // 13: SLG%, 14: BB, 15: HBP, 16: SO, 17: GDP, 18: OB%,
    // 19: SF, 20: SH, 21: SB-ATT
    if (cells.length < 22) continue;

    const jersey = cells[0];
    const name = cells[1];

    // Skip totals/opponents rows (no jersey number)
    if (!jersey || isNaN(parseInt(jersey))) continue;

    // Parse GP-GS (e.g., "30 - 30")
    const gpgs = cells[4].split("-").map((s: string) => parseInt(s.trim()));
    const gamesPlayed = gpgs[0] || 0;
    const gamesStarted = gpgs.length > 1 ? gpgs[1] || 0 : 0;

    // Parse SB-ATT (e.g., "17 - 20")
    const sbatt = cells[21].split("-").map((s: string) => parseInt(s.trim()));
    const stolenBases = sbatt[0] || 0;
    const stolenBaseAttempts = sbatt.length > 1 ? sbatt[1] || 0 : 0;

    stats.push({
      jersey,
      name,
      avg: parseFloat(cells[2]) || 0,
      ops: parseFloat(cells[3]) || 0,
      gamesPlayed,
      gamesStarted,
      atBats: parseInt(cells[5]) || 0,
      runs: parseInt(cells[6]) || 0,
      hits: parseInt(cells[7]) || 0,
      doubles: parseInt(cells[8]) || 0,
      triples: parseInt(cells[9]) || 0,
      homeRuns: parseInt(cells[10]) || 0,
      rbi: parseInt(cells[11]) || 0,
      totalBases: parseInt(cells[12]) || 0,
      slugPct: parseFloat(cells[13]) || 0,
      walks: parseInt(cells[14]) || 0,
      hitByPitch: parseInt(cells[15]) || 0,
      strikeouts: parseInt(cells[16]) || 0,
      obPct: parseFloat(cells[18]) || 0,
      stolenBases,
      stolenBaseAttempts,
    });
  }

  return stats;
}

// ---- Pitching Stats Parser (Nuxt JSON Payload) ----

interface PitchingStat {
  jersey: string;
  name: string;
  era: number;
  whip: number;
  wins: number;
  losses: number;
  appearances: number;
  gamesStarted: number;
  completeGames: number;
  shutouts: number;
  saves: number;
  inningsPitched: number;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walksAllowed: number;
  strikeouts: number;
  homeRunsAllowed: number;
  oppBattingAvg: number;
}

function parsePitchingFromJson(html: string): PitchingStat[] {
  const stats: PitchingStat[] = [];

  // Extract the Nuxt JSON payload from <script type="application/json">
  const jsonMatch = html.match(
    /<script[^>]*type="application\/json"[^>]*>(.*?)<\/script>/s
  );
  if (!jsonMatch) return stats;

  let data: unknown[];
  try {
    data = JSON.parse(jsonMatch[1]);
  } catch {
    return stats;
  }

  if (!Array.isArray(data)) return stats;

  // Helper to resolve indexed references in the Nuxt payload
  function resolve(idx: unknown): unknown {
    if (typeof idx === "number" && idx >= 0 && idx < data.length) {
      return data[idx];
    }
    return idx;
  }

  function resolveStr(idx: unknown): string {
    const val = resolve(idx);
    return val !== null && val !== undefined ? String(val) : "";
  }

  function resolveNum(idx: unknown): number {
    const val = resolve(idx);
    return parseFloat(String(val)) || 0;
  }

  function resolveInt(idx: unknown): number {
    const val = resolve(idx);
    return parseInt(String(val)) || 0;
  }

  // Find pitching stat objects — they have "earnedRunAverage" and "playerUniform" keys
  // The first batch of entries are "Overall" stats, duplicates after that are "Conference" stats.
  // We track seen jersey numbers to only keep the first (Overall) entry for each player.
  const seenJerseys = new Set<string>();

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (
      typeof item !== "object" ||
      item === null ||
      Array.isArray(item)
    )
      continue;

    const obj = item as Record<string, unknown>;
    if (!("earnedRunAverage" in obj) || !("playerUniform" in obj)) continue;

    const name = resolveStr(obj.playerName);
    const jersey = resolveStr(obj.playerUniform);

    // Skip totals/opponents/empty rows
    if (
      !jersey ||
      jersey === "None" ||
      name === "Totals" ||
      name === "Opponents" ||
      !name
    )
      continue;

    // Skip conference duplicate (only keep first = Overall)
    if (seenJerseys.has(jersey)) continue;
    seenJerseys.add(jersey);

    stats.push({
      jersey,
      name,
      era: resolveNum(obj.earnedRunAverage),
      whip: resolveNum(obj.whip),
      wins: resolveInt(obj.wins),
      losses: resolveInt(obj.losses),
      appearances: resolveInt(obj.appearances),
      gamesStarted: resolveInt(obj.gamesStarted),
      completeGames: resolveInt(obj.gamesCompleted),
      shutouts: resolveInt(obj.shutouts),
      saves: resolveInt(obj.saves),
      inningsPitched: resolveNum(obj.inningsPitched),
      hitsAllowed: resolveInt(obj.hitsAllowed),
      runsAllowed: resolveInt(obj.runsAllowed),
      earnedRuns: resolveInt(obj.earnedRunsAllowed),
      walksAllowed: resolveInt(obj.walksAllowed),
      strikeouts: resolveInt(obj.strikeouts),
      homeRunsAllowed: resolveInt(obj.homeRunsAllowed),
      oppBattingAvg: resolveNum(obj.opponentsBattingAverage),
    });
  }

  return stats;
}
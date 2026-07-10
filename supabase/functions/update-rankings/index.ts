// Supabase Edge Function: update-rankings
// Fetches softball RPI and ELO rankings from Warren Nolan and upserts into rankings table.
// Scheduled via pg_cron every 6 hours.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RankingRow {
  id: string;
  team_name: string;
  rpi_rank: number | null;
  elo_rank: number | null;
  elo_value: number | null;
  record: string | null;
  conference: string | null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseRPIPage(html: string): Map<string, RankingRow> {
  const teams = new Map<string, RankingRow>();

  // CRITICAL: No literal closing tags allowed. Use string concatenation.
  const RE_ROW = new RegExp("<tr[^>]*>[\\s\\S]*?<" + "/tr>", "g");
  // Rank is in a data-bold cell (first one in the row)
  const RE_RANK = new RegExp("data-bold[^>]*>(\\d+)<" + "/td>");
  const RE_TEAM = new RegExp('class="blue-black"[^>]*>([^<]+)<' + "/a>");
  const RE_CONF = new RegExp("font-weight:normal[^>]*>([^<]+)<" + "/span>");
  // Match data-center cells that do NOT have data-bold (excludes rank and change cells)
  const RE_CELLS = new RegExp(
    '<td[^>]*class="data-cell data-center(?!.*data-bold)[^"]*"[^>]*>([^<]*)<' + "/td>",
    "g"
  );

  let rowMatch;
  while ((rowMatch = RE_ROW.exec(html)) !== null) {
    const row = rowMatch[0];

    const rankMatch = RE_RANK.exec(row);
    if (!rankMatch) continue;
    const rpiRank = parseInt(rankMatch[1], 10);

    const teamMatch = RE_TEAM.exec(row);
    if (!teamMatch) continue;
    const teamName = teamMatch[1].trim();

    const confMatch = RE_CONF.exec(row);
    let conference: string | null = null;
    if (confMatch) {
      // Extract conference name before the parenthetical record
      const confText = confMatch[1].trim();
      const parenIdx = confText.indexOf("(");
      conference = parenIdx > 0 ? confText.substring(0, parenIdx).trim() : confText;
    }

    // Extract record from non-bold data-center cells
    const cells: string[] = [];
    let cellMatch;
    RE_CELLS.lastIndex = 0;
    while ((cellMatch = RE_CELLS.exec(row)) !== null) {
      cells.push(cellMatch[1].trim());
    }
    // First non-bold data-center cell is the overall record (e.g. "22-6")
    const record = cells.length > 0 ? cells[0] : null;

    const id = slugify(teamName);
    teams.set(id, {
      id,
      team_name: teamName,
      rpi_rank: rpiRank,
      elo_rank: null,
      elo_value: null,
      record,
      conference,
    });
  }

  return teams;
}

function parseELOPage(
  html: string,
  existing: Map<string, RankingRow>
): Map<string, RankingRow> {
  const RE_ROW = new RegExp("<tr[^>]*>[\\s\\S]*?<" + "/tr>", "g");
  const RE_TEAM = new RegExp('class="blue-black"[^>]*>([^<]+)<' + "/a>");
  // ELO page: rank is in cell-right-black (not data-bold)
  const RE_ELO_RANK = new RegExp(
    'cell-right-black[^>]*>(\\d+)<' + "/td>"
  );
  // All data-center cells (record, elo value, rank, change)
  const RE_CELLS = new RegExp(
    '<td[^>]*class="data-cell data-center[^"]*"[^>]*>([^<]*)<' + "/td>",
    "g"
  );

  let rowMatch;
  while ((rowMatch = RE_ROW.exec(html)) !== null) {
    const row = rowMatch[0];

    const teamMatch = RE_TEAM.exec(row);
    if (!teamMatch) continue;
    const teamName = teamMatch[1].trim();
    const id = slugify(teamName);

    // ELO rank is in the cell-right-black cell
    const rankMatch = RE_ELO_RANK.exec(row);
    const eloRank = rankMatch ? parseInt(rankMatch[1], 10) : null;

    // Extract all data-center cell values
    // ELO page structure: record (e.g. "5-0"), elo value (e.g. "1728.06"), rank, change
    const cells: string[] = [];
    let cellMatch;
    RE_CELLS.lastIndex = 0;
    while ((cellMatch = RE_CELLS.exec(row)) !== null) {
      cells.push(cellMatch[1].trim());
    }

    // ELO value is the cell with a decimal number > 100 (e.g. 1728.06)
    let eloValue: number | null = null;
    for (const cell of cells) {
      const num = parseFloat(cell);
      if (!isNaN(num) && num > 100 && cell.includes(".")) {
        eloValue = num;
        break;
      }
    }

    if (existing.has(id)) {
      const entry = existing.get(id)!;
      entry.elo_rank = eloRank;
      entry.elo_value = eloValue;
    } else {
      // Team only on ELO page, not RPI — use first cell as record
      const record = cells.length > 0 ? cells[0] : null;
      existing.set(id, {
        id,
        team_name: teamName,
        rpi_rank: null,
        elo_rank: eloRank,
        elo_value: eloValue,
        record,
        conference: null,
      });
    }
  }

  return existing;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startedAt = new Date().toISOString();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Fetch RPI page
    const rpiRes = await fetch(
      "https://www.warrennolan.com/softball/2026/rpi-live",
      { headers: { "User-Agent": "IUSoftballFanHub/1.0" } }
    );
    if (!rpiRes.ok) throw new Error("RPI fetch failed: " + rpiRes.status);
    const rpiHtml = await rpiRes.text();

    // 2. Parse RPI data
    const teams = parseRPIPage(rpiHtml);
    console.log("Parsed RPI data for " + teams.size + " teams");

    // 3. Fetch ELO page
    const eloRes = await fetch(
      "https://www.warrennolan.com/softball/2026/elo",
      { headers: { "User-Agent": "IUSoftballFanHub/1.0" } }
    );
    if (!eloRes.ok) throw new Error("ELO fetch failed: " + eloRes.status);
    const eloHtml = await eloRes.text();

    // 4. Parse ELO data and merge
    parseELOPage(eloHtml, teams);
    console.log("Merged ELO data, total teams: " + teams.size);

    // 5. Upsert into rankings table
    const rows = Array.from(teams.values()).map((t) => ({
      id: t.id,
      team_name: t.team_name,
      rpi_rank: t.rpi_rank,
      elo_rank: t.elo_rank,
      elo_value: t.elo_value,
      record: t.record,
      conference: t.conference,
      last_updated: new Date().toISOString(),
    }));

    // Upsert in batches of 50
    let upsertedCount = 0;
    const batchErrors: string[] = [];
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { error } = await supabase
        .from("rankings")
        .upsert(batch, { onConflict: "id" });

      if (error) {
        console.error("Upsert batch error:", error.message);
        batchErrors.push(error.message);
      } else {
        upsertedCount += batch.length;
      }
    }

    let runStatus: "success" | "partial" | "failure" = "success";
    if (batchErrors.length > 0 && upsertedCount === 0) runStatus = "failure";
    else if (batchErrors.length > 0) runStatus = "partial";
    else if (rows.length === 0) runStatus = "failure";

    await supabase.from("data_source_runs").insert({
      source: "update-rankings",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: runStatus,
      rows_parsed: rows.length,
      rows_written: upsertedCount,
      error_summary: batchErrors.slice(0, 10).join("; ") || null,
    });

    return new Response(
      JSON.stringify({
        message: "Rankings updated",
        status: runStatus,
        rpi_teams_parsed: teams.size,
        upserted: upsertedCount,
        updated_at: new Date().toISOString(),
      }),
      {
        status: runStatus === "failure" ? 500 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    await supabase.from("data_source_runs").insert({
      source: "update-rankings",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: "failure",
      rows_parsed: 0,
      rows_written: 0,
      error_summary: (error as Error).message,
    });
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
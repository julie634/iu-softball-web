// check-data-health — alerts when ingestion sources fail or go stale.
// Schedule via pg_cron job `check-softball-data-health` (hourly at :15).
// Migration 20260821021000 clones the existing Edge Function invoke pattern
// and does not embed secrets.
//
// ALERT_WEBHOOK_URL is unset as of 2026-08-21. Until that secret is added,
// this function returns a structured health report without sending alerts.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Freshness SLAs (hours) while in-season — used as config constants for Prompt 5. */
const FRESHNESS_SLA_HOURS: Record<string, number> = {
  "update-scores": 12,
  "update-stats": 48,
  "update-news": 24 * 7,
  "update-rankings": 24,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhook = Deno.env.get("ALERT_WEBHOOK_URL")?.trim() || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const sources = Object.keys(FRESHNESS_SLA_HOURS);
    const issues: string[] = [];

    for (const source of sources) {
      const { data: runs, error } = await supabase
        .from("data_source_runs")
        .select("status, started_at, finished_at, rows_written, error_summary")
        .eq("source", source)
        .order("started_at", { ascending: false })
        .limit(10);

      if (error) {
        issues.push(`${source}: cannot read data_source_runs (${error.message})`);
        continue;
      }
      if (!runs || runs.length === 0) {
        issues.push(`${source}: no runs recorded yet`);
        continue;
      }

      const latest = runs[0];
      const prev = runs[1];
      if (latest.status === "failure" && prev?.status === "failure") {
        issues.push(
          `${source}: failed twice consecutively — ${latest.error_summary || "no detail"}`,
        );
      }

      const finished = latest.finished_at || latest.started_at;
      const ageHours =
        (Date.now() - new Date(finished).getTime()) / (1000 * 60 * 60);
      const sla = FRESHNESS_SLA_HOURS[source] ?? 48;
      if (ageHours > sla) {
        issues.push(
          `${source}: last success-ish run is ${ageHours.toFixed(1)}h old (SLA ${sla}h)`,
        );
      }

      // rows_written drop >50% vs trailing average of successful runs
      const written = runs
        .filter((r) => r.status === "success" || r.status === "partial")
        .map((r) => r.rows_written ?? 0);
      if (written.length >= 4) {
        const recent = written[0];
        const trail = written.slice(1, 6);
        const avg = trail.reduce((a, b) => a + b, 0) / trail.length;
        if (avg > 0 && recent < avg * 0.5) {
          issues.push(
            `${source}: rows_written ${recent} is >50% below trailing avg ${avg.toFixed(1)}`,
          );
        }
      }
    }

    let alertSent = false;
    if (issues.length > 0 && webhook) {
      const text = `IU Softball data health\n${issues.map((i) => `• ${i}`).join("\n")}`;
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      alertSent = res.ok;
      if (!res.ok) {
        issues.push(`webhook post failed: ${res.status}`);
      }
    }

    return new Response(
      JSON.stringify({
        ok: issues.length === 0,
        issues,
        alertSent,
        webhookConfigured: Boolean(webhook),
        note: webhook
          ? undefined
          : "Set secret ALERT_WEBHOOK_URL to enable notifications",
        checkedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

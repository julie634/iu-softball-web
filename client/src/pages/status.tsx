import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ALERT_WEBHOOK_STATUS, CRON_JOBS } from "@/content/ops";
import { useDataSourceRuns } from "@/hooks/use-supabase";
import { format } from "date-fns";

export default function StatusPage() {
  const { data: runs } = useDataSourceRuns();

  return (
    <div className="space-y-6" data-testid="status-page">
      <div>
        <h1 className="text-lg font-bold">Data health</h1>
        <p className="text-xs text-muted-foreground mt-1">
          pg_cron jobs on project thrwhtqeogdnkwpvcwlk, confirmed 2026-08-21.
        </p>
      </div>

      <Card className="p-4 border border-card-border text-xs text-muted-foreground">
        {ALERT_WEBHOOK_STATUS}
      </Card>

      <div className="space-y-2">
        {CRON_JOBS.map((job) => (
          <Card key={job.jobname} className="p-4 border border-card-border">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-sm font-semibold">{job.jobname}</p>
              <Badge variant="secondary" className="text-[10px]">
                {job.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {job.cadence} · Edge Function <code>{job.edgeFunction}</code>
            </p>
            <p className="text-xs text-muted-foreground mt-1">{job.lastSuccessNote}</p>
          </Card>
        ))}
      </div>

      {runs && runs.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Recent data_source_runs
          </h2>
          <div className="space-y-2">
            {runs.slice(0, 12).map((run) => (
              <Card key={run.id} className="p-3 border border-card-border">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{run.source}</p>
                  <Badge
                    variant={run.status === "failure" ? "destructive" : "secondary"}
                    className="text-[10px]"
                  >
                    {run.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(run.started_at), "MMM d, yyyy · HH:mm")} UTC
                  {run.rows_written != null ? ` · ${run.rows_written} rows` : ""}
                </p>
                {run.error_summary && (
                  <p className="text-xs text-destructive mt-1">{run.error_summary}</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

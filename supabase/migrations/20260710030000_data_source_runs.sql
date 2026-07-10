-- Job health records for Edge Function ingestion runs (Prompt 5)

CREATE TABLE IF NOT EXISTS public.data_source_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  started_at timestamp with time zone NOT NULL,
  finished_at timestamp with time zone,
  status text NOT NULL,
  rows_parsed integer,
  rows_written integer,
  error_summary text,
  CONSTRAINT data_source_runs_status_check
    CHECK (status = ANY (ARRAY['success'::text, 'partial'::text, 'failure'::text]))
);

CREATE INDEX IF NOT EXISTS data_source_runs_source_started_idx
  ON public.data_source_runs (source, started_at DESC);

ALTER TABLE public.data_source_runs ENABLE ROW LEVEL SECURITY;

-- Anon may only read (frontend freshness / data health)
DROP POLICY IF EXISTS "Public read access" ON public.data_source_runs;
CREATE POLICY "Public read access"
  ON public.data_source_runs
  FOR SELECT
  USING (true);

GRANT SELECT ON public.data_source_runs TO anon;
GRANT SELECT ON public.data_source_runs TO authenticated;
GRANT ALL ON public.data_source_runs TO service_role;

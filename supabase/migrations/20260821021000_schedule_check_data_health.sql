-- Schedule check-data-health by cloning an existing softball Edge Function
-- cron command. That reuses whatever Authorization/vault pattern is already
-- in production and avoids committing JWTs or service-role keys.
--
-- Also re-asserts update-softball-rankings is active (it was found inactive
-- on 2026-08-21 and a coordinator re-enabled it).

DO $migrate$
DECLARE
  template text;
  health_cmd text;
  existing_id bigint;
  rankings_id bigint;
BEGIN
  SELECT jobid INTO rankings_id
  FROM cron.job
  WHERE jobname = 'update-softball-rankings'
  LIMIT 1;

  IF rankings_id IS NOT NULL THEN
    BEGIN
      PERFORM cron.alter_job(rankings_id, active := true);
    EXCEPTION
      WHEN undefined_function THEN
        UPDATE cron.job SET active = true WHERE jobid = rankings_id;
    END;
  END IF;

  SELECT command INTO template
  FROM cron.job
  WHERE jobname IN (
    'update-softball-stats',
    'update-softball-scores',
    'update-softball-news',
    'update-softball-rankings'
  )
    AND command ILIKE '%/functions/v1/%'
  ORDER BY CASE jobname
    WHEN 'update-softball-stats' THEN 1
    WHEN 'update-softball-scores' THEN 2
    ELSE 3
  END
  LIMIT 1;

  IF template IS NULL THEN
    RAISE NOTICE
      'Skipping check-softball-data-health: no sibling Edge Function cron row to clone';
    RETURN;
  END IF;

  health_cmd := template;
  health_cmd := replace(health_cmd, 'update-stats', 'check-data-health');
  health_cmd := replace(health_cmd, 'update-scores', 'check-data-health');
  health_cmd := replace(health_cmd, 'update-news', 'check-data-health');
  health_cmd := replace(health_cmd, 'update-rankings', 'check-data-health');

  IF position('check-data-health' in health_cmd) = 0 THEN
    RAISE EXCEPTION
      'Could not derive check-data-health command from sibling cron row';
  END IF;

  SELECT jobid INTO existing_id
  FROM cron.job
  WHERE jobname = 'check-softball-data-health'
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_id);
  END IF;

  PERFORM cron.schedule(
    'check-softball-data-health',
    '15 * * * *',
    health_cmd
  );
END
$migrate$;

-- Harden table privileges for the public (anon) role.
-- RLS already blocks writes (SELECT-only policies), but GRANT ALL + default
-- privileges that include INSERT/UPDATE/DELETE are unsafe defense-in-depth.
-- service_role and authenticated keep broader grants for Edge Functions / future auth.
--
-- Review before applying: supabase db push  (or run in SQL Editor)

-- Future tables created by postgres should not auto-grant writes to anon
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE ON TABLES FROM anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;

-- Existing tables: anon may only SELECT
REVOKE INSERT, UPDATE, DELETE ON TABLE
  public.games,
  public.players,
  public.batting_stats,
  public.pitching_stats,
  public.news_articles,
  public.social_posts,
  public.rankings
FROM anon;

GRANT SELECT ON TABLE
  public.games,
  public.players,
  public.batting_stats,
  public.pitching_stats,
  public.news_articles,
  public.social_posts,
  public.rankings
TO anon;

-- Keep service_role fully privileged (Edge Functions use service role key)
GRANT ALL ON TABLE
  public.games,
  public.players,
  public.batting_stats,
  public.pitching_stats,
  public.news_articles,
  public.social_posts,
  public.rankings
TO service_role;

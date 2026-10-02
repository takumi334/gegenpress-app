-- Enable RLS without granting direct Data API access to anon/authenticated.
-- Gegenpress reads and writes through server-side Prisma using a DB role
-- that bypasses RLS. This migration does not change DB roles or table grants.
-- Existing rows, columns, and policies are left unchanged. With no policies,
-- RLS denies access to roles that do not bypass it.

BEGIN;

ALTER TABLE IF EXISTS public."スレッド" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."投稿" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tactics_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.thread_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.predicted_lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.predicted_lineup_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auto_thread_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prediction_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.translation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Video" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."LyricLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."VideoSubmission" ENABLE ROW LEVEL SECURITY;

COMMIT;

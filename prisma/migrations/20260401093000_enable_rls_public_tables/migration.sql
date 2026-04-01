-- Enable RLS on public app tables and add minimum safe policies.
-- Priority: block dangerous public writes/deletes, keep read access where needed.
-- Note: this targets Supabase PostgREST roles (anon/authenticated). Server-side Prisma
-- connections typically use privileged DB roles and are not constrained by these policies.

-- 1) Public schema app tables (from current Prisma schema)
-- "スレッド", "投稿", "tactics_boards", "post_likes", "thread_likes", "Report",
-- "scheduled_posts", "players", "predicted_lineups", "predicted_lineup_players",
-- "auto_thread_jobs", "prediction_cache", "translation_cache", "Video", "LyricLine", "VideoSubmission"

-- 2) Enable RLS
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

-- 3) Drop old policies if already present (idempotent)
DROP POLICY IF EXISTS threads_select_public ON public."スレッド";
DROP POLICY IF EXISTS threads_insert_authenticated ON public."スレッド";
DROP POLICY IF EXISTS posts_select_public ON public."投稿";
DROP POLICY IF EXISTS posts_insert_authenticated ON public."投稿";
DROP POLICY IF EXISTS tactics_select_public ON public.tactics_boards;
DROP POLICY IF EXISTS tactics_insert_authenticated ON public.tactics_boards;
DROP POLICY IF EXISTS thread_likes_select_public ON public.thread_likes;
DROP POLICY IF EXISTS thread_likes_insert_authenticated ON public.thread_likes;
DROP POLICY IF EXISTS post_likes_select_public ON public.post_likes;
DROP POLICY IF EXISTS post_likes_insert_authenticated ON public.post_likes;
DROP POLICY IF EXISTS reports_insert_authenticated ON public."Report";
DROP POLICY IF EXISTS players_select_public ON public.players;
DROP POLICY IF EXISTS lineup_select_public ON public.predicted_lineups;
DROP POLICY IF EXISTS lineup_players_select_public ON public.predicted_lineup_players;
DROP POLICY IF EXISTS translation_cache_select_public ON public.translation_cache;
DROP POLICY IF EXISTS prediction_cache_select_public ON public.prediction_cache;

-- 4) Read policies (public-readable data only)
CREATE POLICY threads_select_public
  ON public."スレッド"
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY posts_select_public
  ON public."投稿"
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY tactics_select_public
  ON public.tactics_boards
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY thread_likes_select_public
  ON public.thread_likes
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY post_likes_select_public
  ON public.post_likes
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY players_select_public
  ON public.players
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY lineup_select_public
  ON public.predicted_lineups
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY lineup_players_select_public
  ON public.predicted_lineup_players
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Cache tables are okay to read (translate/predict rendering helpers)
CREATE POLICY translation_cache_select_public
  ON public.translation_cache
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY prediction_cache_select_public
  ON public.prediction_cache
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5) Write policies (minimum, safe side)
-- Allow writes only to authenticated users for public entry points.
-- Update/Delete are intentionally NOT granted here (default deny),
-- so dangerous public mutation paths are blocked.
CREATE POLICY threads_insert_authenticated
  ON public."スレッド"
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY posts_insert_authenticated
  ON public."投稿"
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY tactics_insert_authenticated
  ON public.tactics_boards
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY thread_likes_insert_authenticated
  ON public.thread_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY post_likes_insert_authenticated
  ON public.post_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Reports can contain sensitive data (IP/UA). Do not allow public read.
-- Keep only authenticated insert as minimum.
CREATE POLICY reports_insert_authenticated
  ON public."Report"
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

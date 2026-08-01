-- Run this SQL in your Supabase Dashboard → SQL Editor
-- Run AFTER 0002_portal_tables.sql (map_zones seed).
--
-- Merges "Container Row A" and "Container Row B" into a single "Workshops"
-- zone, and drops "Quiet Room", bringing map_zones from 8 rows to 6 so the
-- 3-column legend grid on /portal/map divides evenly with no dangling row.
--
-- Idempotent: safe to re-run.

UPDATE public.map_zones
SET name = 'Workshops',
	description = 'Workshops, judging round 1',
	sort_order = 3
WHERE name = 'Container Row A';

DELETE FROM public.map_zones WHERE name = 'Container Row B';
DELETE FROM public.map_zones WHERE name = 'Quiet Room';

UPDATE public.map_zones
SET description = 'Near Workshops and The Yard'
WHERE name = 'Washrooms';

-- Resequence sort_order for the remaining zones.
UPDATE public.map_zones SET sort_order = 4 WHERE name = 'Market Hall';
UPDATE public.map_zones SET sort_order = 5 WHERE name = 'Registration / check-in';
UPDATE public.map_zones SET sort_order = 6 WHERE name = 'Washrooms';

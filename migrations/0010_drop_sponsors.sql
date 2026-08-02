-- Run this SQL in your Supabase Dashboard → SQL Editor
-- Run AFTER 0002_portal_tables.sql / 0003_user_roles.sql.
--
-- Removes the Sponsor Board feature. The /portal/sponsors page, its nav tab,
-- the Sponsor type and getSponsors() are gone from the app, so nothing reads
-- public.sponsors any more. The sponsor DDL and seed rows have also been
-- stripped from 0002/0003, so a fresh database never creates this table -
-- this migration exists for projects that already ran those files.
--
-- Also drops the one seeded announcement about sponsor booths. The schedule
-- events ("Sponsor tech talks", "Sponsor booths open") and the Market Hall
-- map zone are intentionally left alone - they're agenda/venue content.
--
-- Idempotent: safe to re-run.

-- Policies and grants on the table go with it.
DROP TABLE IF EXISTS public.sponsors CASCADE;

DELETE FROM public.announcements
WHERE body = 'Sponsor booths in Market Hall open at 11:30. Bring questions for Fenwick Robotics and Cobalt Systems.';

-- Run this SQL in your Supabase Dashboard → SQL Editor
-- Run AFTER 0003_user_roles.sql, BEFORE 0012_staff_management.sql.
--
-- Adds the 'superadmin' role for a database that already ran an earlier
-- version of 0003_user_roles.sql (that file has since been retro-edited to
-- include 'superadmin' directly, so a fresh database never needs this file).
--
-- This has to be its own migration, run on its own: Postgres will not let a
-- transaction reference an enum value added earlier in the same transaction,
-- and the Supabase SQL editor runs a pasted script as one transaction. Run
-- this file alone, wait for it to finish, then run 0012 separately.
--
-- superadmin is never granted through the app - promote the first one by hand:
--   SELECT public.set_user_role('<uuid>', 'superadmin');

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'superadmin';

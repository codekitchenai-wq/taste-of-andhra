-- Ensure platform_master exists even if the full SaaS migration is applied later.
-- Safe to run multiple times.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'platform_master';

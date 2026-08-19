-- Store the straight-line distance (km) from the customer's saved GPS pin
-- to the restaurant branch. Computed at save/edit time by the app.
-- NULL when no GPS coordinates were captured (manual-entry addresses).

ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS distance_km NUMERIC(7, 2) DEFAULT NULL;

COMMENT ON COLUMN public.addresses.distance_km IS
  'Haversine distance (km) from address pin to restaurant branch, recomputed on every save.';

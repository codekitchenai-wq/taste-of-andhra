-- Own-fleet rate card: base charge + optional ₹/km based on straight-line
-- distance from the branch pin to the customer address pin.
--
-- When per_km_charge is 0 (default), behaviour matches the previous flat
-- fallback_charge. Distance still comes from check_delivery_service_area().

ALTER TABLE public.delivery_settings
  ADD COLUMN IF NOT EXISTS per_km_charge NUMERIC(10, 2) NOT NULL DEFAULT 0
    CHECK (per_km_charge >= 0);

COMMENT ON COLUMN public.delivery_settings.per_km_charge IS
  'Added to fallback_charge for each km between branch and address (haversine). 0 keeps a flat rate.';

COMMENT ON COLUMN public.delivery_settings.fallback_charge IS
  'Base own-fleet delivery charge. Also used when a third-party quote is unavailable. With per_km_charge > 0, total = base + distance_km * per_km.';

NOTIFY pgrst, 'reload schema';

-- Scope automatic WhatsApp opt-in to Taste of Andhra only.
-- Other restaurants keep the column default (off) until they opt in.

ALTER TABLE public.orders
  ALTER COLUMN whatsapp_updates_opt_in SET DEFAULT false;

CREATE OR REPLACE FUNCTION public.orders_force_whatsapp_opt_in()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.organization_id = 'a0000000-0000-4000-8000-000000000001' THEN
    NEW.whatsapp_updates_opt_in := true;
  END IF;
  RETURN NEW;
END;
$$;

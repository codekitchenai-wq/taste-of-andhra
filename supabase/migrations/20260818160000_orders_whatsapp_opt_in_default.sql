-- Customers are opted in to WhatsApp order updates by default.
-- Restaurants control which statuses send from Admin → Settings.

ALTER TABLE public.orders
  ALTER COLUMN whatsapp_updates_opt_in SET DEFAULT true;

CREATE OR REPLACE FUNCTION public.orders_force_whatsapp_opt_in()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.whatsapp_updates_opt_in := true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_force_whatsapp_opt_in ON public.orders;

CREATE TRIGGER trg_orders_force_whatsapp_opt_in
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.orders_force_whatsapp_opt_in();

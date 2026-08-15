-- Customers may view their orders but must not change order_status (cancel /
-- kitchen transitions). Restaurant staff (is_org_admin / is_admin) retain full
-- control. Delivery partners are not the order owner, so their SECURITY DEFINER
-- RPC updates remain allowed.

CREATE OR REPLACE FUNCTION public.enforce_order_status_staff_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.order_status IS DISTINCT FROM OLD.order_status
     AND OLD.user_id IS NOT NULL
     AND OLD.user_id = auth.uid()
     AND NOT public.is_admin()
     AND NOT public.is_org_admin(OLD.organization_id) THEN
    RAISE EXCEPTION 'Only restaurant staff can change order status'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_order_status_staff_only ON public.orders;
CREATE TRIGGER enforce_order_status_staff_only
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_status_staff_only();

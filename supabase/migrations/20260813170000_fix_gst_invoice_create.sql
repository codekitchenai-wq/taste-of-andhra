-- GST invoice create was failing for customers:
-- INSERT WITH CHECK queried public.orders under RLS (same anti-pattern that
-- broke order/delivery/admin reads). Use owns_order() / is_admin() helpers
-- and a SECURITY DEFINER get-or-create so invoice generation does not depend
-- on nested table policies.

GRANT SELECT, INSERT ON public.gst_invoices TO authenticated;

DROP POLICY IF EXISTS "GST invoices are viewable by order owner or admin"
  ON public.gst_invoices;
DROP POLICY IF EXISTS "GST invoices are insertable by admin or order owner"
  ON public.gst_invoices;

CREATE POLICY "GST invoices are viewable by order owner or admin"
  ON public.gst_invoices
  FOR SELECT
  TO authenticated
  USING (public.owns_order(order_id) OR public.is_admin());

CREATE POLICY "GST invoices are insertable by admin or order owner"
  ON public.gst_invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (public.owns_order(order_id) OR public.is_admin());

CREATE OR REPLACE FUNCTION public.ensure_gst_invoice(p_order_id UUID)
RETURNS public.gst_invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_invoice public.gst_invoices%ROWTYPE;
  v_branch_id UUID;
  v_branch_gstin TEXT;
  v_taxable NUMERIC(10, 2);
  v_cgst NUMERIC(10, 2);
  v_sgst NUMERIC(10, 2);
  v_total NUMERIC(10, 2);
  v_gstin TEXT;
  v_invoice_number TEXT;
  v_gst_raw TEXT;
  v_gst_enabled BOOLEAN := FALSE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT (public.owns_order(p_order_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'Not authorized to create invoice for this order'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_invoice
  FROM public.gst_invoices
  WHERE order_id = p_order_id;

  IF FOUND THEN
    RETURN v_invoice;
  END IF;

  SELECT value INTO v_gst_raw
  FROM public.app_settings
  WHERE key = 'gst_settings'
    AND organization_id = v_order.organization_id;

  IF v_gst_raw IS NOT NULL AND btrim(v_gst_raw) <> '' THEN
    BEGIN
      v_gst_enabled := COALESCE(
        (v_gst_raw::jsonb ->> 'enabled')::boolean,
        FALSE
      );
    EXCEPTION
      WHEN others THEN
        v_gst_enabled := FALSE;
    END;
  END IF;

  IF NOT v_gst_enabled THEN
    RAISE EXCEPTION 'GST invoices are not enabled'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_order.branch_id IS NOT NULL THEN
    SELECT id, gstin INTO v_branch_id, v_branch_gstin
    FROM public.branches
    WHERE id = v_order.branch_id
      AND is_active = TRUE;
  END IF;

  IF v_branch_id IS NULL THEN
    SELECT id, gstin INTO v_branch_id, v_branch_gstin
    FROM public.branches
    WHERE organization_id = v_order.organization_id
      AND is_default = TRUE
      AND is_active = TRUE
    LIMIT 1;
  END IF;

  IF v_branch_id IS NULL THEN
    SELECT id, gstin INTO v_branch_id, v_branch_gstin
    FROM public.branches
    WHERE organization_id = v_order.organization_id
      AND is_active = TRUE
    ORDER BY is_default DESC, name
    LIMIT 1;
  END IF;

  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION 'No active branch configured for invoice'
      USING ERRCODE = 'P0002';
  END IF;

  v_gstin := COALESCE(
    NULLIF(btrim(v_branch_gstin), ''),
    (
      SELECT NULLIF(upper(btrim(value::jsonb ->> 'gstin')), '')
      FROM public.app_settings
      WHERE key = 'gst_settings'
        AND organization_id = v_order.organization_id
    ),
    (
      SELECT NULLIF(btrim(o.gstin), '')
      FROM public.organizations o
      WHERE o.id = v_order.organization_id
    )
  );

  IF v_gstin IS NULL THEN
    RAISE EXCEPTION 'GSTIN is not configured'
      USING ERRCODE = 'P0002';
  END IF;

  v_taxable := GREATEST(
    0,
    ROUND((v_order.subtotal - v_order.discount)::NUMERIC, 2)
  );
  v_cgst := ROUND(v_taxable * 0.025, 2);
  v_sgst := ROUND(v_taxable * 0.025, 2);
  v_total := ROUND(v_taxable + v_cgst + v_sgst + v_order.delivery_charge, 2);
  v_invoice_number := 'INV-' || v_order.order_number;

  BEGIN
    INSERT INTO public.gst_invoices (
      organization_id,
      order_id,
      branch_id,
      invoice_number,
      gstin,
      taxable_amount,
      cgst,
      sgst,
      igst,
      total
    ) VALUES (
      v_order.organization_id,
      v_order.id,
      v_branch_id,
      v_invoice_number,
      v_gstin,
      v_taxable,
      v_cgst,
      v_sgst,
      0,
      v_total
    )
    RETURNING * INTO v_invoice;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT * INTO v_invoice
      FROM public.gst_invoices
      WHERE order_id = p_order_id;

      IF NOT FOUND THEN
        RAISE;
      END IF;
  END;

  RETURN v_invoice;
END;
$$;

COMMENT ON FUNCTION public.ensure_gst_invoice(UUID) IS
  'Get or create a GST invoice for an order the caller owns (or admin).';

REVOKE ALL ON FUNCTION public.ensure_gst_invoice(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_gst_invoice(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Taste of Andhra: WhatsApp order updates only for placed, out for delivery,
-- and delivered. Other restaurants keep their own enabled_statuses in Admin.

UPDATE public.organization_whatsapp_configs
SET
  enabled_statuses = '{
    "pending": true,
    "confirmed": false,
    "preparing": false,
    "ready": false,
    "out_for_delivery": true,
    "delivered": true,
    "cancelled": false
  }'::jsonb,
  template_map = COALESCE(template_map, '{}'::jsonb) || '{
    "pending": {"name": "order_confirmed", "language": "en"}
  }'::jsonb,
  updated_at = now()
WHERE organization_id = 'a0000000-0000-4000-8000-000000000001';

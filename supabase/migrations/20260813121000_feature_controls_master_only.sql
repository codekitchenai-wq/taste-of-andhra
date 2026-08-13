-- Feature on/off is platform-master only. Restaurant admins cannot view
-- the control matrix or enable/disable modules.

CREATE OR REPLACE FUNCTION public.get_org_feature_states(target_org_id UUID)
RETURNS TABLE (
  feature_key TEXT,
  name TEXT,
  description TEXT,
  is_add_on BOOLEAN,
  is_core BOOLEAN,
  default_enabled BOOLEAN,
  display_order INTEGER,
  enabled BOOLEAN,
  source TEXT,
  requires TEXT[],
  enabled_dependents TEXT[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.is_platform_master() THEN
    RAISE EXCEPTION 'Only the platform master can view restaurant feature controls'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organizations o WHERE o.id = target_org_id
  ) THEN
    RAISE EXCEPTION 'Organization not found'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  SELECT
    f.key AS feature_key,
    f.name AS name,
    f.description AS description,
    f.is_add_on AS is_add_on,
    f.is_core AS is_core,
    f.default_enabled AS default_enabled,
    f.display_order AS display_order,
    public.feature_is_entitled(target_org_id, f.key) AS enabled,
    oe.source::TEXT AS source,
    COALESCE(
      (
        SELECT array_agg(fd.requires_feature_key ORDER BY fd.requires_feature_key)
        FROM public.feature_dependencies fd
        WHERE fd.feature_key = f.key
      ),
      ARRAY[]::TEXT[]
    ) AS requires,
    COALESCE(
      (
        SELECT array_agg(dep_key ORDER BY dep_key)
        FROM (
          SELECT unnest(public.feature_dependent_closure(f.key)) AS dep_key
        ) d
        WHERE public.feature_is_entitled(target_org_id, d.dep_key)
      ),
      ARRAY[]::TEXT[]
    ) AS enabled_dependents
  FROM public.features f
  LEFT JOIN public.organization_entitlements oe
    ON oe.organization_id = target_org_id
   AND oe.feature_key = f.key
  ORDER BY f.display_order, f.name;
END;
$$;

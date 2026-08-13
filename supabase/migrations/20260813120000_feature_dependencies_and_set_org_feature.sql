-- Feature dependencies + Master-only per-tenant entitlement control.
-- Restaurant admins cannot enable or disable modules. Platform master
-- (set_org_feature) enables required parents automatically and blocks
-- (or cascades) disable when dependents are still on.

-- ---------------------------------------------------------------------------
-- Core flag: these modules cannot be turned off
-- ---------------------------------------------------------------------------

ALTER TABLE public.features
  ADD COLUMN IF NOT EXISTS is_core BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.features
SET is_core = TRUE
WHERE key IN ('menu', 'orders', 'customers', 'settings');

COMMENT ON COLUMN public.features.is_core IS
  'Core modules required for every active tenant. Master cannot disable them.';

-- ---------------------------------------------------------------------------
-- Dependency catalog
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.feature_dependencies (
  feature_key TEXT NOT NULL REFERENCES public.features (key) ON DELETE CASCADE,
  requires_feature_key TEXT NOT NULL REFERENCES public.features (key) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (feature_key, requires_feature_key),
  CONSTRAINT feature_dependencies_no_self CHECK (feature_key <> requires_feature_key)
);

CREATE INDEX IF NOT EXISTS idx_feature_dependencies_requires
  ON public.feature_dependencies (requires_feature_key);

COMMENT ON TABLE public.feature_dependencies IS
  'feature_key requires requires_feature_key. Enabling a feature enables its closure.';

ALTER TABLE public.feature_dependencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Feature dependencies are readable by authenticated"
  ON public.feature_dependencies;
CREATE POLICY "Feature dependencies are readable by authenticated"
  ON public.feature_dependencies
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Platform master manages feature dependencies"
  ON public.feature_dependencies;
CREATE POLICY "Platform master manages feature dependencies"
  ON public.feature_dependencies
  FOR ALL
  TO authenticated
  USING (public.is_platform_master())
  WITH CHECK (public.is_platform_master());

INSERT INTO public.feature_dependencies (feature_key, requires_feature_key)
SELECT v.feature_key, v.requires_feature_key
FROM (
  VALUES
    ('whatsapp_ordering', 'whatsapp_notifications'),
    ('whatsapp_ordering', 'orders'),
    ('whatsapp_ordering', 'menu'),
    ('whatsapp_notifications', 'orders'),
    ('sms_notifications', 'orders'),
    ('delivery_pidge', 'delivery_own'),
    ('qr_tables', 'menu'),
    ('qr_tables', 'orders'),
    ('loyalty', 'customers')
) AS v(feature_key, requires_feature_key)
WHERE EXISTS (SELECT 1 FROM public.features f WHERE f.key = v.feature_key)
  AND EXISTS (SELECT 1 FROM public.features f WHERE f.key = v.requires_feature_key)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Closures
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.feature_requirement_closure(p_feature_key TEXT)
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  WITH RECURSIVE req AS (
    SELECT p_feature_key AS key, ARRAY[p_feature_key] AS path
    UNION ALL
    SELECT fd.requires_feature_key, req.path || fd.requires_feature_key
    FROM public.feature_dependencies fd
    JOIN req ON req.key = fd.feature_key
    WHERE NOT fd.requires_feature_key = ANY (req.path)
  )
  SELECT COALESCE(array_agg(DISTINCT key), ARRAY[p_feature_key])
  FROM req;
$$;

-- Entitlement only (ignores subscription). Used by Master toggles.
CREATE OR REPLACE FUNCTION public.feature_is_entitled(
  target_org_id UUID,
  p_feature_key TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.organization_entitlements oe
        WHERE oe.organization_id = target_org_id
          AND oe.feature_key = p_feature_key
      ) THEN (
        SELECT oe.enabled
        FROM public.organization_entitlements oe
        WHERE oe.organization_id = target_org_id
          AND oe.feature_key = p_feature_key
      )
      WHEN EXISTS (
        SELECT 1
        FROM public.features f
        WHERE f.key = p_feature_key
          AND (f.default_enabled = TRUE OR f.is_core = TRUE)
      ) THEN TRUE
      WHEN EXISTS (
        SELECT 1
        FROM public.subscriptions s
        JOIN public.plan_features pf ON pf.plan_id = s.plan_id
        WHERE s.organization_id = target_org_id
          AND s.status IN ('trialing', 'active', 'past_due')
          AND pf.feature_key = p_feature_key
      ) THEN TRUE
      ELSE FALSE
    END;
$$;

CREATE OR REPLACE FUNCTION public.feature_dependent_closure(p_feature_key TEXT)
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  WITH RECURSIVE deps AS (
    SELECT p_feature_key AS key, ARRAY[p_feature_key] AS path
    UNION ALL
    SELECT fd.feature_key, deps.path || fd.feature_key
    FROM public.feature_dependencies fd
    JOIN deps ON deps.key = fd.requires_feature_key
    WHERE NOT fd.feature_key = ANY (deps.path)
  )
  SELECT COALESCE(
    array_agg(DISTINCT key) FILTER (WHERE key <> p_feature_key),
    ARRAY[]::TEXT[]
  )
  FROM deps;
$$;

-- ---------------------------------------------------------------------------
-- Read model for platform master only
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Write: Master toggle with dependency handling
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_org_feature(
  target_org_id UUID,
  p_feature_key TEXT,
  p_enabled BOOLEAN,
  p_cascade BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_feature public.features%ROWTYPE;
  v_required TEXT[];
  v_dependents TEXT[];
  v_enabled_dependents TEXT[] := ARRAY[]::TEXT[];
  v_changed TEXT[] := ARRAY[]::TEXT[];
  v_already TEXT[] := ARRAY[]::TEXT[];
  v_key TEXT;
  v_dep TEXT;
  v_source public.entitlement_source;
  v_notes TEXT;
BEGIN
  IF NOT public.is_platform_master() THEN
    RAISE EXCEPTION 'Only the platform master can change restaurant features. Restaurant users cannot enable or disable modules.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organizations o WHERE o.id = target_org_id
  ) THEN
    RAISE EXCEPTION 'Organization not found'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_feature
  FROM public.features f
  WHERE f.key = p_feature_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown feature: %', p_feature_key
      USING ERRCODE = '22023';
  END IF;

  IF p_enabled THEN
    v_required := public.feature_requirement_closure(p_feature_key);

    FOREACH v_key IN ARRAY v_required
    LOOP
      IF public.feature_is_entitled(target_org_id, v_key) THEN
        v_already := array_append(v_already, v_key);
        CONTINUE;
      END IF;

      IF v_key = p_feature_key THEN
        v_source := 'manual';
        v_notes := 'Master toggle';
      ELSE
        v_source := 'addon';
        v_notes := 'Required by ' || p_feature_key;
      END IF;

      INSERT INTO public.organization_entitlements (
        organization_id,
        feature_key,
        enabled,
        source,
        notes
      )
      VALUES (
        target_org_id,
        v_key,
        TRUE,
        v_source,
        v_notes
      )
      ON CONFLICT (organization_id, feature_key) DO UPDATE
      SET
        enabled = TRUE,
        source = EXCLUDED.source,
        notes = EXCLUDED.notes,
        updated_at = NOW();

      v_changed := array_append(v_changed, v_key);
    END LOOP;

    RETURN jsonb_build_object(
      'ok', TRUE,
      'feature_key', p_feature_key,
      'enabled', TRUE,
      'changed', to_jsonb(v_changed),
      'already_set', to_jsonb(v_already),
      'message', CASE
        WHEN coalesce(array_length(v_changed, 1), 0) = 0
          THEN 'Already enabled'
        WHEN coalesce(array_length(v_changed, 1), 0) = 1
          THEN 'Feature enabled'
        ELSE 'Feature enabled with required modules'
      END
    );
  END IF;

  -- Disable
  IF v_feature.is_core THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'CORE_FEATURE',
      'feature_key', p_feature_key,
      'enabled', TRUE,
      'changed', '[]'::jsonb,
      'already_set', '[]'::jsonb,
      'message', v_feature.name || ' is a core module and cannot be turned off'
    );
  END IF;

  v_dependents := public.feature_dependent_closure(p_feature_key);
  FOREACH v_dep IN ARRAY v_dependents
  LOOP
    IF public.feature_is_entitled(target_org_id, v_dep) THEN
      v_enabled_dependents := array_append(v_enabled_dependents, v_dep);
    END IF;
  END LOOP;

  IF coalesce(array_length(v_enabled_dependents, 1), 0) > 0
     AND NOT coalesce(p_cascade, FALSE) THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'DEPENDENTS_ENABLED',
      'feature_key', p_feature_key,
      'enabled', TRUE,
      'blocked_by', to_jsonb(v_enabled_dependents),
      'changed', '[]'::jsonb,
      'already_set', '[]'::jsonb,
      'message', 'Turn off dependent features first, or confirm cascade'
    );
  END IF;

  v_required := ARRAY[p_feature_key] || v_enabled_dependents;

  FOREACH v_key IN ARRAY v_required
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.features f WHERE f.key = v_key AND f.is_core
    ) THEN
      CONTINUE;
    END IF;

    IF NOT public.feature_is_entitled(target_org_id, v_key) THEN
      v_already := array_append(v_already, v_key);
      CONTINUE;
    END IF;

    INSERT INTO public.organization_entitlements (
      organization_id,
      feature_key,
      enabled,
      source,
      notes
    )
    VALUES (
      target_org_id,
      v_key,
      FALSE,
      'manual',
      CASE
        WHEN v_key = p_feature_key THEN 'Master toggle'
        ELSE 'Disabled with ' || p_feature_key
      END
    )
    ON CONFLICT (organization_id, feature_key) DO UPDATE
    SET
      enabled = FALSE,
      source = 'manual',
      notes = EXCLUDED.notes,
      updated_at = NOW();

    v_changed := array_append(v_changed, v_key);
  END LOOP;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'feature_key', p_feature_key,
    'enabled', FALSE,
    'changed', to_jsonb(v_changed),
    'already_set', to_jsonb(v_already),
    'message', CASE
      WHEN coalesce(array_length(v_changed, 1), 0) <= 1 THEN 'Feature disabled'
      ELSE 'Feature and dependents disabled'
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.feature_requirement_closure(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.feature_dependent_closure(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.feature_is_entitled(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_org_feature_states(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_org_feature(UUID, TEXT, BOOLEAN, BOOLEAN) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.feature_requirement_closure(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.feature_dependent_closure(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.feature_is_entitled(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_feature_states(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_org_feature(UUID, TEXT, BOOLEAN, BOOLEAN) TO authenticated;

GRANT EXECUTE ON FUNCTION public.feature_requirement_closure(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.feature_dependent_closure(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.feature_is_entitled(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_org_feature_states(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_org_feature(UUID, TEXT, BOOLEAN, BOOLEAN) TO service_role;

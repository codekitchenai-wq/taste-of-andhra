-- Keep dishes.rating in sync with the reviews table.
-- Previously the average was recomputed from the browser, but dishes is
-- admin-write-only under RLS, so a customer's update matched zero rows and
-- failed silently. SECURITY DEFINER lets the trigger write as the table owner.

CREATE OR REPLACE FUNCTION public.recalculate_dish_rating(target_dish_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.dishes
  SET rating = (
    SELECT ROUND(AVG(rating), 1)
    FROM public.reviews
    WHERE dish_id = target_dish_id
  )
  WHERE id = target_dish_id;
$$;

-- Only the trigger should call this; it runs as the table owner.
REVOKE EXECUTE ON FUNCTION public.recalculate_dish_rating(UUID) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.sync_dish_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    PERFORM public.recalculate_dish_rating(OLD.dish_id);
  END IF;

  IF TG_OP <> 'DELETE' THEN
    PERFORM public.recalculate_dish_rating(NEW.dish_id);
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_dish_rating_on_review ON public.reviews;
CREATE TRIGGER sync_dish_rating_on_review
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_dish_rating();

-- Backfill dishes that already have reviews. Dishes without any review keep
-- their seeded rating; run the statement below to clear those too.
--   UPDATE public.dishes d SET rating = NULL
--   WHERE NOT EXISTS (SELECT 1 FROM public.reviews r WHERE r.dish_id = d.id);
UPDATE public.dishes d
SET rating = agg.average
FROM (
  SELECT dish_id, ROUND(AVG(rating), 1) AS average
  FROM public.reviews
  GROUP BY dish_id
) agg
WHERE d.id = agg.dish_id;

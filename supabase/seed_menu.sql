-- Seed / refresh sample menu using local app images from /public/images
-- Paths are relative to the site origin (localhost or Vercel).
-- Run in Supabase → SQL Editor (safe to re-run)

INSERT INTO public.categories (name, slug, description, image_url, display_order, is_active)
VALUES
  ('Starters', 'starters', 'Crispy Andhra appetizers', '/images/categories/starters.jpg', 1, TRUE),
  ('Biryani', 'biryani', 'Spiced rice specialties', '/images/categories/biryani.jpg', 2, TRUE),
  ('Curries', 'curries', 'Rich Andhra gravies', '/images/categories/curries.jpg', 3, TRUE),
  ('Breads', 'breads', 'Freshly made rotis and naan', '/images/categories/breads.jpg', 4, TRUE),
  ('Beverages', 'beverages', 'Coolers and traditional drinks', '/images/categories/beverages.jpg', 5, TRUE)
ON CONFLICT (slug) DO UPDATE
SET
  image_url = EXCLUDED.image_url,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  is_active = TRUE;

INSERT INTO public.dishes (
  category_id, name, slug, description, ingredients, price, image_url,
  spice_level, preparation_time, is_veg, is_available, is_featured, rating
)
SELECT
  c.id, d.name, d.slug, d.description, d.ingredients, d.price, d.image_url,
  d.spice_level::public.spice_level, d.preparation_time, d.is_veg, TRUE, d.is_featured, d.rating
FROM public.categories c
JOIN (
  VALUES
    ('starters', 'Punugulu', 'punugulu', 'Crispy fermented rice fritters', 'Rice batter, spices', 120.00, '/images/dishes/punugulu.jpg', 'medium', 15, TRUE, TRUE, 4.5),
    ('starters', 'Chicken 65', 'chicken-65', 'Spicy deep-fried chicken', 'Chicken, red chilli, curry leaves', 280.00, '/images/dishes/chicken-65.jpg', 'hot', 25, FALSE, TRUE, 4.7),
    ('biryani', 'Gongura Mutton Biryani', 'gongura-mutton-biryani', 'Andhra classic with sorrel leaves', 'Mutton, gongura, basmati rice', 420.00, '/images/dishes/gongura-mutton-biryani.jpg', 'hot', 45, FALSE, TRUE, 4.8),
    ('biryani', 'Veg Dum Biryani', 'veg-dum-biryani', 'Fragrant vegetable biryani', 'Mixed vegetables, basmati rice', 250.00, '/images/dishes/veg-dum-biryani.jpg', 'medium', 35, TRUE, FALSE, 4.4),
    ('curries', 'Andhra Chicken Curry', 'andhra-chicken-curry', 'Spicy red chicken gravy', 'Chicken, red chilli, coconut', 320.00, '/images/dishes/andhra-chicken-curry.jpg', 'extra_hot', 30, FALSE, TRUE, 4.6),
    ('curries', 'Gutthi Vankaya', 'gutthi-vankaya', 'Stuffed brinjal curry', 'Brinjal, peanut, spices', 220.00, '/images/dishes/gutthi-vankaya.jpg', 'medium', 30, TRUE, FALSE, 4.3),
    ('breads', 'Butter Naan', 'butter-naan', 'Soft tandoor-baked naan', 'Flour, butter, yeast', 60.00, '/images/dishes/butter-naan.jpg', 'mild', 10, TRUE, FALSE, 4.2),
    ('beverages', 'Nannari Sharbat', 'nannari-sharbat', 'Cooling herbal drink', 'Nannari root, lemon, sugar', 80.00, '/images/dishes/nannari-sharbat.jpg', 'mild', 5, TRUE, FALSE, 4.1)
) AS d(category_slug, name, slug, description, ingredients, price, image_url, spice_level, preparation_time, is_veg, is_featured, rating)
  ON c.slug = d.category_slug
ON CONFLICT (slug) DO UPDATE
SET
  image_url = EXCLUDED.image_url,
  description = EXCLUDED.description,
  ingredients = EXCLUDED.ingredients,
  price = EXCLUDED.price,
  spice_level = EXCLUDED.spice_level,
  preparation_time = EXCLUDED.preparation_time,
  is_veg = EXCLUDED.is_veg,
  is_available = TRUE,
  is_featured = EXCLUDED.is_featured,
  rating = EXCLUDED.rating,
  category_id = EXCLUDED.category_id;

UPDATE public.dishes
SET image_url = '/images/dishes/gongura-mutton-biryani.jpg'
WHERE image_url IS NULL OR btrim(image_url) = '' OR image_url LIKE 'https://images.unsplash.com/%';

UPDATE public.categories
SET image_url = '/images/categories/curries.jpg'
WHERE image_url IS NULL OR btrim(image_url) = '' OR image_url LIKE 'https://images.unsplash.com/%';

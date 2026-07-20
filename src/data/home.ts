export interface HomeCategory {
  id: string
  name: string
  slug: string
  imageUrl: string
  dishCount: number
}

export interface HomeDish {
  id: string
  name: string
  slug: string
  description: string
  price: number
  imageUrl: string
  isVeg: boolean
  rating: number
  prepTime: number
}

export interface WhyChooseUsItem {
  title: string
  description: string
}

export interface Testimonial {
  id: string
  name: string
  rating: number
  quote: string
  location: string
}

export const heroContent = {
  headline: 'Authentic Andhra Flavors, Delivered Fresh',
  description:
    'From fiery biryanis to comforting home-style curries — experience the true taste of Andhra Pradesh, crafted with tradition and served with love.',
  imageUrl:
    'https://images.unsplash.com/photo-1563379091335-03a21aa4a2d7?auto=format&fit=crop&w=1920&q=80',
}

export const featuredCategories: HomeCategory[] = [
  {
    id: '1',
    name: 'Biryani',
    slug: 'biryani',
    imageUrl:
      'https://images.unsplash.com/photo-1563379091335-03a21aa4a2d7?auto=format&fit=crop&w=600&q=80',
    dishCount: 12,
  },
  {
    id: '2',
    name: 'Starters',
    slug: 'starters',
    imageUrl:
      'https://images.unsplash.com/photo-1606491956689-2ea6a0b0b0c8?auto=format&fit=crop&w=600&q=80',
    dishCount: 18,
  },
  {
    id: '3',
    name: 'Curries',
    slug: 'curries',
    imageUrl:
      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80',
    dishCount: 24,
  },
  {
    id: '4',
    name: 'Desserts',
    slug: 'desserts',
    imageUrl:
      'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80',
    dishCount: 8,
  },
]

export const featuredDishes: HomeDish[] = [
  {
    id: '1',
    name: 'Hyderabadi Dum Biryani',
    slug: 'hyderabadi-dum-biryani',
    description: 'Aromatic basmati rice layered with tender mutton and saffron.',
    price: 349,
    imageUrl:
      'https://images.unsplash.com/photo-1563379091335-03a21aa4a2d7?auto=format&fit=crop&w=600&q=80',
    isVeg: false,
    rating: 4.8,
    prepTime: 35,
  },
  {
    id: '2',
    name: 'Gongura Mutton Curry',
    slug: 'gongura-mutton-curry',
    description: 'Tangy sorrel leaves slow-cooked with spiced mutton.',
    price: 329,
    imageUrl:
      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80',
    isVeg: false,
    rating: 4.7,
    prepTime: 30,
  },
  {
    id: '3',
    name: 'Paneer Butter Masala',
    slug: 'paneer-butter-masala',
    description: 'Creamy tomato gravy with soft cottage cheese cubes.',
    price: 249,
    imageUrl:
      'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
    isVeg: true,
    rating: 4.6,
    prepTime: 20,
  },
  {
    id: '4',
    name: 'Pesarattu Dosa',
    slug: 'pesarattu-dosa',
    description: 'Crispy green gram crepe served with ginger chutney.',
    price: 129,
    imageUrl:
      'https://images.unsplash.com/photo-1668236540534-995b9a1a042a?auto=format&fit=crop&w=600&q=80',
    isVeg: true,
    rating: 4.5,
    prepTime: 15,
  },
]

export const whyChooseUsItems: WhyChooseUsItem[] = [
  {
    title: 'Authentic Recipes',
    description:
      'Traditional Andhra recipes passed down through generations, prepared with authentic spices.',
  },
  {
    title: 'Fresh Ingredients',
    description:
      'We source fresh produce daily to ensure every dish bursts with natural flavor.',
  },
  {
    title: 'Fast Delivery',
    description:
      'Hot meals delivered to your doorstep within 45 minutes across the city.',
  },
  {
    title: 'Hygienic Kitchen',
    description:
      'Our kitchen follows strict hygiene standards for safe, quality food every time.',
  },
]

export const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Priya Sharma',
    rating: 5,
    quote:
      'The Hyderabadi Biryani reminds me of my grandmother\'s cooking. Absolutely authentic and delicious!',
    location: 'Hyderabad',
  },
  {
    id: '2',
    name: 'Rahul Reddy',
    rating: 5,
    quote:
      'Best Andhra food delivery in the city. The Gongura curry is a must-try — perfectly tangy and spicy.',
    location: 'Secunderabad',
  },
  {
    id: '3',
    name: 'Ananya Krishnan',
    rating: 4.8,
    quote:
      'Love the variety and quick delivery. Pesarattu dosa tastes just like the ones from Vijayawada streets.',
    location: 'Gachibowli',
  },
]

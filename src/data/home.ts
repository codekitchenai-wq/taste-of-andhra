import { LOCAL_IMAGES } from '@/constants/IMAGES'

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
  imageUrl: LOCAL_IMAGES.hero,
}

export const featuredCategories: HomeCategory[] = [
  {
    id: '1',
    name: 'Biryani',
    slug: 'biryani',
    imageUrl: LOCAL_IMAGES.categories.biryani,
    dishCount: 12,
  },
  {
    id: '2',
    name: 'Starters',
    slug: 'starters',
    imageUrl: LOCAL_IMAGES.categories.starters,
    dishCount: 18,
  },
  {
    id: '3',
    name: 'Curries',
    slug: 'curries',
    imageUrl: LOCAL_IMAGES.categories.curries,
    dishCount: 24,
  },
  {
    id: '4',
    name: 'Desserts',
    slug: 'desserts',
    imageUrl: LOCAL_IMAGES.categories.desserts,
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
    imageUrl: LOCAL_IMAGES.dishes.hyderabadiDumBiryani,
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
    imageUrl: LOCAL_IMAGES.dishes.gonguraMuttonCurry,
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
    imageUrl: LOCAL_IMAGES.dishes.paneerButterMasala,
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
    imageUrl: LOCAL_IMAGES.dishes.pesarattuDosa,
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
      "The Hyderabadi Biryani reminds me of my grandmother's cooking. Absolutely authentic and delicious!",
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

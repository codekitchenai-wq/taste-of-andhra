import { LOCAL_IMAGES } from '@/constants/IMAGES'

export interface GalleryImage {
  id: string
  src: string
  alt: string
  category: 'dishes' | 'categories' | 'hero'
}

export const galleryImages: GalleryImage[] = [
  {
    id: 'hero',
    src: LOCAL_IMAGES.hero,
    alt: 'Taste of Andhra restaurant hero',
    category: 'hero',
  },
  {
    id: 'starters-cat',
    src: LOCAL_IMAGES.categories.starters,
    alt: 'Andhra starters',
    category: 'categories',
  },
  {
    id: 'biryani-cat',
    src: LOCAL_IMAGES.categories.biryani,
    alt: 'Biryani specialties',
    category: 'categories',
  },
  {
    id: 'curries-cat',
    src: LOCAL_IMAGES.categories.curries,
    alt: 'Andhra curries',
    category: 'categories',
  },
  {
    id: 'chicken-65',
    src: LOCAL_IMAGES.dishes.chicken65,
    alt: 'Chicken 65',
    category: 'dishes',
  },
  {
    id: 'gongura-biryani',
    src: LOCAL_IMAGES.dishes.gonguraMuttonBiryani,
    alt: 'Gongura Mutton Biryani',
    category: 'dishes',
  },
  {
    id: 'hyderabadi-biryani',
    src: LOCAL_IMAGES.dishes.hyderabadiDumBiryani,
    alt: 'Hyderabadi Dum Biryani',
    category: 'dishes',
  },
  {
    id: 'andhra-chicken',
    src: LOCAL_IMAGES.dishes.andhraChickenCurry,
    alt: 'Andhra Chicken Curry',
    category: 'dishes',
  },
  {
    id: 'gutthi-vankaya',
    src: LOCAL_IMAGES.dishes.gutthiVankaya,
    alt: 'Gutthi Vankaya',
    category: 'dishes',
  },
  {
    id: 'punugulu',
    src: LOCAL_IMAGES.dishes.punugulu,
    alt: 'Punugulu',
    category: 'dishes',
  },
  {
    id: 'butter-naan',
    src: LOCAL_IMAGES.dishes.butterNaan,
    alt: 'Butter Naan',
    category: 'dishes',
  },
  {
    id: 'nannari',
    src: LOCAL_IMAGES.dishes.nannariSharbat,
    alt: 'Nannari Sharbat',
    category: 'dishes',
  },
]

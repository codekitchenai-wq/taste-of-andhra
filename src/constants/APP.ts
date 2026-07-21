export const APP_NAME = 'Taste of Andhra'
export const APP_TAGLINE = 'Authentic Andhra Cuisine'
export const APP_DESCRIPTION =
  'Experience the rich flavors of Andhra Pradesh — order online for delivery or pickup.'

const RESTAURANT_ADDRESS =
  'D 304 Harsha Pride, 6 Cross Kaggadaspura, C V Rama Nagar, Bangalore, 560093'

export const CONTACT = {
  phone: '+91 98765 43210',
  email: 'thetasteofandhra@gmail.com',
  address: RESTAURANT_ADDRESS,
  /** Opens Google Maps with directions to the restaurant from the user's location */
  mapsDirectionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    RESTAURANT_ADDRESS,
  )}`,
} as const

export const OPENING_HOURS = {
  weekdays: '11:00 AM – 11:00 PM',
  weekends: '10:00 AM – 11:30 PM',
} as const

export const STORAGE_BUCKET = 'restaurant-images'

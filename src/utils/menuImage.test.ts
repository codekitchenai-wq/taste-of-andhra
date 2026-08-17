import { describe, expect, it } from 'vitest'
import {
  isAndhraLocalAsset,
  optimizeMenuImage,
  tenantSafeImage,
} from './menuImage'

describe('isAndhraLocalAsset', () => {
  it('flags Taste of Andhra static photos', () => {
    expect(isAndhraLocalAsset('/images/categories/biryani.jpg')).toBe(true)
    expect(isAndhraLocalAsset('/images/dishes/chicken-65.jpg')).toBe(true)
    expect(isAndhraLocalAsset('/images/hero/hero.jpg')).toBe(true)
  })

  it('allows tenant hero and remote menus', () => {
    expect(isAndhraLocalAsset('/images/tenants/spice-malabar-hero.png')).toBe(
      false,
    )
    expect(
      isAndhraLocalAsset(
        'https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_400/abc',
      ),
    ).toBe(false)
  })
})

describe('optimizeMenuImage', () => {
  it('tightens an existing Swiggy width transform', () => {
    expect(
      optimizeMenuImage(
        'https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_400/FOOD_CATALOG/x.JPG',
        240,
      ),
    ).toBe(
      'https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_240/FOOD_CATALOG/x.JPG',
    )
  })

  it('inserts transforms before a versioned Cloudinary id', () => {
    expect(
      optimizeMenuImage(
        'https://media-assets.swiggy.com/swiggy/image/upload/v1674029856/abc',
        320,
      ),
    ).toBe(
      'https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_320/v1674029856/abc',
    )
  })

  it('leaves local paths unchanged', () => {
    expect(optimizeMenuImage('/images/tenants/spice-malabar-hero.png', 800)).toBe(
      '/images/tenants/spice-malabar-hero.png',
    )
  })
})

describe('tenantSafeImage', () => {
  it('does not use Andhra photos on another tenant', () => {
    expect(
      tenantSafeImage(
        '/images/categories/biryani.jpg',
        'spice-malabar',
        '/images/tenants/spice-malabar-hero.png',
      ),
    ).toBe('/images/tenants/spice-malabar-hero.png')
  })
})

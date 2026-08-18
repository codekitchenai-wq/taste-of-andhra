import { describe, expect, it } from 'vitest'
import { restaurantImageObjectPath } from './restaurantImagePath'

describe('restaurantImageObjectPath', () => {
  it('scopes uploads under the restaurant id', () => {
    expect(
      restaurantImageObjectPath(
        'org-spice',
        'dishes',
        'dish-1',
        'photo.jpg',
      ),
    ).toBe('orgs/org-spice/dishes/dish-1/photo.jpg')
  })
})

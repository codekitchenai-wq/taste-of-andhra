import { describe, expect, it } from 'vitest'
import { parseMenuCsv } from '@/utils/parseMenuCsv'
import {
  buildRestaurantSetupCsv,
  parseHoursRange,
  parseRestaurantSetupCsv,
} from '@/utils/parseRestaurantSetupCsv'
import { validateOnboardingCsv } from '@/utils/validateOnboardingCsv'

/** Realistic Andhra / South-Indian restaurant pack a manager would send on WhatsApp. */
const ANDHRA_SETUP = buildRestaurantSetupCsv({
  restaurantName: 'Rayalaseema Kitchen',
  publicPhone: '9876543210',
  publicEmail: 'hello@rayalaseema.in',
  addressLine1: '14 100 Feet Road',
  landmark: 'Opposite More Supermarket',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560038',
  gstin: '29AABCT1332L1ZV',
  fssaiLicense: '11224333000123',
  tagline: 'Guntur heat, home-style meals',
  hoursWeekdays: '11:00 AM – 11:00 PM',
  hoursWeekends: '10:30 AM – 11:30 PM',
  delivers: true,
  servicePincodes: ['560038', '560043', '560075'],
  deliveryRadiusKm: 6,
  deliveryCharge: 49,
  freeDeliveryAbove: 399,
  etaMinutes: 45,
  upiId: 'rayalaseema@okaxis',
  upiPayeeName: 'Rayalaseema Kitchen',
})

const ANDHRA_MENU = `category,name,price,is_veg,spice_level,description
Starters,Punugulu,99,TRUE,medium,Crispy rice-lentil fritters
Starters,Andhra Chicken 65,280,FALSE,hot,Deep-fried chicken with curry leaves
Biryani,Gongura Mutton Biryani,349,FALSE,hot,Sorrel-leaf mutton dum biryani
Biryani,Veg Dum Biryani,219,TRUE,medium,Hyderabadi style vegetable biryani
Curries,Gongura Chicken,299,FALSE,hot,Andhra chicken in sorrel gravy
Curries,Tomato Pappu,160,TRUE,mild,Tangy toor dal
Breads,Butter Naan,50,TRUE,mild,Tandoor naan
Beverages,Majjiga,40,TRUE,mild,Spiced buttermilk`

describe('Restaurant ops — go-live happy path', () => {
  it('accepts a complete Andhra restaurant setup + menu', () => {
    const setup = validateOnboardingCsv('setup', ANDHRA_SETUP, 'rayalaseema-setup.csv')
    const menu = validateOnboardingCsv('menu', ANDHRA_MENU, 'rayalaseema-menu.csv')
    expect(setup.ok).toBe(true)
    expect(menu.ok).toBe(true)
    expect(parseMenuCsv(ANDHRA_MENU).rows).toHaveLength(8)
  })

  it('allows skipping sheets (create now, fill later)', () => {
    expect(validateOnboardingCsv('setup', '', 'setup.csv').ok).toBe(false)
  })
})

describe('Restaurant ops — how owners actually write hours', () => {
  it('accepts 12-hour, 24-hour, and 11am-11pm', () => {
    expect(parseHoursRange('11:00 AM – 11:00 PM')?.open).toBe('11:00')
    expect(parseHoursRange('11:00-23:00')?.close).toBe('23:00')
    expect(parseHoursRange('11am-11pm')?.close).toBe('23:00')
    expect(parseHoursRange('10:30 AM to 11:30 PM')?.open).toBe('10:30')
    expect(parseHoursRange('Closed')?.isOpen).toBe(false)
  })

  it('accepts overnight kitchen hours', () => {
    expect(parseHoursRange('22:00-02:00')).toEqual({
      isOpen: true,
      open: '22:00',
      close: '02:00',
    })
  })
})

describe('Restaurant ops — menu as kitchen/cashier would type it', () => {
  it('strips ₹ Rs and commas from prices', () => {
    const csv = `category,name,price,is_veg
Biryani,Chicken Dum Biryani,₹349,FALSE
Biryani,Mutton Biryani,"Rs 1,099",no
Starters,Punugulu,99,yes`
    const parsed = parseMenuCsv(csv)
    expect(parsed.errors).toEqual([])
    expect(parsed.rows.map((row) => row.price)).toEqual([349, 1099, 99])
    expect(parsed.rows[2].isVeg).toBe(true)
  })

  it('reads Veg / Non-veg the way menu cards are written', () => {
    const csv = `category,name,price,is_veg
Starters,Paneer 65,180,Veg
Starters,Chicken 65,220,Non-veg
Starters,Gobi Manchurian,160,V
Starters,Chilli Chicken,240,NV`
    const parsed = parseMenuCsv(csv)
    expect(parsed.errors).toEqual([])
    expect(parsed.rows.map((row) => row.isVeg)).toEqual([true, false, true, false])
  })

  it('keeps quoted dish names that contain commas', () => {
    const csv = `category,name,price,is_veg
Biryani,"Chicken Biryani, Boneless",329,FALSE`
    const parsed = parseMenuCsv(csv)
    expect(parsed.rows[0].name).toBe('Chicken Biryani, Boneless')
  })
})

describe('Restaurant ops — delivery / payments / compliance', () => {
  it('rejects 5-digit pincode and UPI without @', () => {
    const csv = buildRestaurantSetupCsv({
      city: 'Hyderabad',
      pincode: '5000',
      upiId: 'paytm-qr-only',
    })
    const result = validateOnboardingCsv('setup', csv, 'bad-setup.csv')
    expect(result.ok).toBe(false)
    expect(result.errors.some((error) => /pincode/i.test(error))).toBe(true)
    expect(result.errors.some((error) => /upi/i.test(error))).toBe(true)
  })

  it('accepts comma or space separated service pincodes', () => {
    const csv = `field,value
service_pincodes,"560038, 560043 560075"
delivers,yes`
    const parsed = parseRestaurantSetupCsv(csv)
    expect(parsed.errors).toEqual([])
    expect(parsed.values.servicePincodes).toEqual(['560038', '560043', '560075'])
  })

  it('treats delivery charge ₹49 as a number', () => {
    const parsed = parseRestaurantSetupCsv(`field,value
delivery_charge,₹49`)
    expect(parsed.errors).toEqual([])
    expect(parsed.values.deliveryCharge).toBe(49)
  })
})

describe('Restaurant ops — mistakes that happen on WhatsApp', () => {
  it('rejects an .xlsx workbook', () => {
    const result = validateOnboardingCsv('menu', 'not csv', 'menu.xlsx')
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/CSV/)
  })

  it('rejects menu uploaded as setup', () => {
    const result = validateOnboardingCsv('setup', ANDHRA_MENU, 'menu-as-setup.csv')
    expect(result.ok).toBe(false)
  })

  it('rejects setup uploaded as menu', () => {
    const result = validateOnboardingCsv('menu', ANDHRA_SETUP, 'setup-as-menu.csv')
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/Missing required columns/)
  })

  it('rejects a menu with some bad rows so kitchen prices are not half-loaded', () => {
    const csv = `category,name,price,is_veg
Starters,Punugulu,99,TRUE
Biryani,Chicken Biryani,ask counter,FALSE
Curries,Tomato Pappu,,TRUE`
    const result = validateOnboardingCsv('menu', csv, 'partial.csv')
    expect(result.ok).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('warns if the sample template menu was sent back unchanged', () => {
    const sample = `category,name,price,is_veg,spice_level,description,preparation_time_minutes,is_available,is_featured,display_order
Starters,Paneer Tikka,249,TRUE,medium,Grilled cottage cheese with spices,20,TRUE,TRUE,1
Starters,Chicken 65,280,FALSE,hot,Spicy deep-fried chicken,25,TRUE,FALSE,2
Main Course,Dal Tadka,180,TRUE,mild,Yellow lentils with tempering,25,TRUE,FALSE,1
Main Course,Butter Chicken,320,FALSE,medium,Creamy tomato chicken curry,30,TRUE,TRUE,2
Breads,Butter Naan,60,TRUE,mild,Soft tandoor-baked naan,10,TRUE,FALSE,1
Beverages,Masala Chaas,60,TRUE,mild,Spiced buttermilk,5,TRUE,FALSE,1`
    const result = validateOnboardingCsv('menu', sample, 'MENU_IMPORT_TEMPLATE.csv')
    expect(result.ok).toBe(true)
    expect(result.warnings.some((warning) => /sample/i.test(warning))).toBe(true)
  })

  it('reads UTF-8 BOM from Excel Save As CSV', () => {
    const csv = `\uFEFFcategory,name,price,is_veg
Starters,Punugulu,99,TRUE`
    expect(validateOnboardingCsv('menu', csv, 'excel.csv').ok).toBe(true)
  })
})

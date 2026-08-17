/**
 * Scrape Chopsticks Spice Malabar (Viman Nagar, Pune) public menus.
 *
 * Primary: Swiggy mobile menu API (includes image IDs, no lazy-load needed).
 * Fallback: Playwright intercepts the same JSON and scrolls the page so
 * lazy-loaded <img> srcs can fill gaps.
 * Magicpin: fetch + optional browser search (listing 899a5 currently 404s).
 *
 * Usage:
 *   node scripts/scrape-spice-malabar-menu.mjs
 *   node scripts/scrape-spice-malabar-menu.mjs --browser
 *   node scripts/scrape-spice-malabar-menu.mjs --raw
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = resolve(ROOT, 'scripts/data')
const OUT_PATH = resolve(DATA_DIR, 'spice-malabar-menu.json')

const SWIGGY_URL =
  'https://www.swiggy.com/city/pune/chopsticks-spice-malabar-viman-nagar-rest28323'
const SWIGGY_MAPI =
  'https://www.swiggy.com/mapi/menu/pl?page-type=REGULAR_MENU&complete-menu=true&lat=18.565402&lng=73.912966&restaurantId=28323'
const MAGICPIN_URLS = [
  'https://magicpin.in/Pune/Viman-Nagar/Restaurant/Chopsticks-Spice-Malabar/store/899a5',
  'https://magicpin.in/Pune/Viman-Nagar/Restaurant/Chopsticks-Spice-Malabar/store/899a5/',
  'https://magicpin.in/Pune/Wadgaon-Sheri/Restaurant/Chopsticks-Spice-Malabar/store/3625c9/',
]
const IMAGE_BASE =
  'https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_400/'

const BROWSER = process.argv.includes('--browser')
const SAVE_RAW = process.argv.includes('--raw')

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  Accept: 'application/json,text/html,*/*',
  'Accept-Language': 'en-IN,en;q=0.9',
  Referer: SWIGGY_URL,
}

function slugifyName(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function inferSpice(name, description) {
  const text = `${name} ${description || ''}`.toLowerCase()
  if (/\b(extra hot|very spicy|gunpowder)\b/.test(text)) return 'extra_hot'
  if (/\b(spicy|chilli|chili|pepper fry|chettinad|schezwan|manchurian)\b/.test(text)) {
    return 'hot'
  }
  if (/\b(mild|stew|appam|payasam|kheer|falooda|ice cream|juice|lassi)\b/.test(text)) {
    return 'mild'
  }
  return 'medium'
}

function inferPrepMinutes(categoryName, itemName) {
  const text = `${categoryName} ${itemName}`.toLowerCase()
  if (/\b(juice|tea|coffe|beverage|soft drink|falooda|ice cream)\b/.test(text)) return 5
  if (/\b(soup|salad|raita|pickle|papad|bread|roti|naan|parotta|appam)\b/.test(text)) {
    return 10
  }
  if (/\b(starter|fry|kebab|tikka|manchurian|chilli|pakora)\b/.test(text)) return 20
  if (/\b(biryani|mandi|thali|pothichoru|meals)\b/.test(text)) return 35
  return 25
}

function isFeaturedName(name, categoryName) {
  const text = `${name} ${categoryName}`.toLowerCase()
  return (
    /\b(malabar|nadan|pothichoru|thali|biryani|appam|fish curry|kappa|alfaham|al faham)\b/.test(
      text,
    ) || /kerala special/.test(text)
  )
}

function itemFromSwiggyInfo(info, categoryName) {
  if (!info?.name) return null
  const paise = info.price ?? info.defaultPrice ?? info.finalPrice
  if (typeof paise !== 'number' || paise <= 0) return null
  const imageId =
    info.imageId ||
    info.cloudinaryImageId ||
    info.richMediaInfo?.imageId ||
    info.image?.id ||
    null
  const description = String(info.description || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const featured = Boolean(
    info.isBestseller ||
      info.isNewlyLaunched ||
      isFeaturedName(info.name, categoryName),
  )
  return {
    name: String(info.name).trim(),
    description: description || null,
    price: Math.round(paise / 100),
    is_veg: info.isVeg === 1 || info.isVeg === true,
    image_url: imageId ? `${IMAGE_BASE}${imageId}` : null,
    spice_level: inferSpice(info.name, description),
    preparation_time: inferPrepMinutes(categoryName, info.name),
    is_featured: featured,
  }
}

function collectSwiggyItems(card, categoryName) {
  const items = []
  for (const row of card.itemCards || []) {
    const parsed = itemFromSwiggyInfo(
      row.card?.info || row.dish?.info,
      categoryName,
    )
    if (parsed) items.push(parsed)
  }
  for (const nested of card.categories || []) {
    items.push(...collectSwiggyItems(nested, nested.title || categoryName))
  }
  return items
}

function dedupeItems(items) {
  const seen = new Set()
  return items.filter((item) => {
    const key = slugifyName(item.name)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function parseSwiggyMenu(payload) {
  const cards = payload?.data?.cards || []
  const rest =
    cards.find((card) => card.card?.card?.info?.id)?.card?.card?.info || {}
  const regular =
    cards.find((card) => card.groupedCard)?.groupedCard?.cardGroupMap?.REGULAR
      ?.cards || []

  const licenseCard = regular.find((card) =>
    String(card.card?.card?.['@type'] || '').includes('RestaurantLicenseInfo'),
  )?.card?.card
  const addressCard = regular.find((card) =>
    String(card.card?.card?.['@type'] || '').includes('RestaurantAddress'),
  )?.card?.card

  const categories = []
  for (const row of regular) {
    const card = row.card?.card || {}
    const type = String(card['@type'] || '')
    if (!type.includes('ItemCategory')) continue
    if (card.title === 'Recommended') continue

    if (type.includes('NestedItemCategory') && Array.isArray(card.categories)) {
      for (const nested of card.categories) {
        const categoryName = String(nested.title || card.title || '')
          .replace(/\s+/g, ' ')
          .trim()
        const items = dedupeItems(collectSwiggyItems(nested, categoryName))
        if (!categoryName || !items.length) continue
        categories.push({ category_name: categoryName, items })
      }
      continue
    }

    const categoryName = String(card.title || '')
      .replace(/\s+/g, ' ')
      .trim()
    const items = dedupeItems(collectSwiggyItems(card, categoryName))
    if (!categoryName || !items.length) continue
    categories.push({ category_name: categoryName, items })
  }

  const fssaiText = Array.isArray(licenseCard?.text)
    ? licenseCard.text.join(' ')
    : String(licenseCard?.text || '')
  const fssai = (fssaiText.match(/\d{8,}/) || [])[0] || null
  const addressLabel = Array.isArray(rest.labels)
    ? rest.labels.find((label) => label.title === 'Address')?.message
    : null

  return {
    restaurant: {
      legal_name: rest.name || 'Chopsticks Spice Malabar',
      city: rest.city || 'Pune',
      locality: rest.locality || rest.areaName || 'Viman Nagar',
      address:
        addressLabel ||
        addressCard?.completeAddress ||
        '1, Gulmohar Regency, Symbiosis College Road, Viman Nagar, Pune',
      cuisines: rest.cuisines || [],
      avg_rating: rest.avgRating ?? null,
      cost_for_two: rest.costForTwoMessage || rest.costForTwo || null,
      logo_url: rest.cloudinaryImageId
        ? `${IMAGE_BASE}${rest.cloudinaryImageId}`
        : null,
      fssai,
      eta_minutes: rest.sla?.deliveryTime || rest.sla?.maxDeliveryTime || 20,
    },
    categories,
  }
}

function parseMagicpinHtml(html) {
  const items = []
  const cardRe =
    /"name"\s*:\s*"([^"]+)"[\s\S]{0,400}?"price"\s*:\s*"?₹?\s*([0-9]+)/gi
  let match
  while ((match = cardRe.exec(html))) {
    items.push({
      name: match[1].replace(/\\u[\dA-Fa-f]{4}/g, '').trim(),
      price: Number(match[2]),
    })
  }

  const imgRe =
    /https?:\/\/[^"'\\\s]+(?:magicpin|mpix)[^"'\\\s]+\.(?:jpg|jpeg|png|webp)/gi
  const images = [...new Set(html.match(imgRe) || [])]
  return { items, images }
}

function mergeMagicpin(categories, magicpin) {
  if (!magicpin?.items?.length) return { filledImages: 0, matched: 0 }
  const byName = new Map()
  for (const category of categories) {
    for (const item of category.items) {
      byName.set(slugifyName(item.name), item)
    }
  }
  let matched = 0
  let filledImages = 0
  for (const extra of magicpin.items) {
    const existing = byName.get(slugifyName(extra.name))
    if (!existing) continue
    matched += 1
    if (!existing.description && extra.description) {
      existing.description = extra.description
    }
    if (!existing.image_url && extra.image_url) {
      existing.image_url = extra.image_url
      filledImages += 1
    }
  }
  return { filledImages, matched }
}

async function fetchSwiggyJson() {
  const res = await fetch(SWIGGY_MAPI, { headers: HEADERS })
  const contentType = res.headers.get('content-type') || ''
  if (!res.ok || !contentType.includes('json')) {
    throw new Error(`Swiggy mapi failed (${res.status} ${contentType})`)
  }
  return res.json()
}

async function fetchMagicpin() {
  const sources = []
  for (const url of MAGICPIN_URLS) {
    try {
      const res = await fetch(url, {
        headers: { ...HEADERS, Referer: 'https://magicpin.in/' },
        redirect: 'follow',
      })
      const html = await res.text()
      sources.push({
        url,
        status: res.status,
        ok: res.status >= 200 && res.status < 400 && !html.includes('404 - magicpin'),
        html,
      })
    } catch (error) {
      sources.push({ url, status: 0, ok: false, error: error.message, html: '' })
    }
  }
    const live = sources.find((source) => source.ok)
    const parsed = live ? parseMagicpinHtml(live.html) : { items: [], images: [] }
    return {
      sources: sources.map((source) => ({
        url: source.url,
        status: source.status,
        ok:
          Boolean(source.ok) &&
          (parsed.items.length > 0 ||
            /Chopsticks Spice Malabar/i.test(source.html || '')),
        error: source.error || null,
      })),
      parsed,
    }
}

async function scrapeWithBrowser() {
  let playwright
  try {
    playwright = await import('playwright')
  } catch {
    throw new Error(
      'Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium',
    )
  }

  const browser = await playwright.chromium.launch({ headless: true })
  const page = await browser.newPage({
    userAgent: HEADERS['User-Agent'],
    locale: 'en-IN',
  })

  let intercepted = null
  await page.route('**/*', async (route) => {
    const request = route.request()
    const url = request.url()
    if (/\/[md]api\/menu\/pl/.test(url)) {
      const response = await route.fetch()
      const json = await response.json().catch(() => null)
      if (json?.data?.cards) intercepted = json
      await route.fulfill({ response })
      return
    }
    await route.continue()
  })

  await page.goto(SWIGGY_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  for (let i = 0; i < 12; i += 1) {
    await page.mouse.wheel(0, 1800)
    await page.waitForTimeout(400)
  }

  const lazyImages = await page.$$eval('img', (imgs) =>
    imgs
      .map((img) => ({
        alt: (img.getAttribute('alt') || '').trim(),
        src: img.currentSrc || img.src || '',
      }))
      .filter((row) => row.src && !row.src.startsWith('data:')),
  )

  const magicpinItems = []
  for (const url of MAGICPIN_URLS) {
    try {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      })
      if (!response || response.status() >= 400) continue
      for (let i = 0; i < 8; i += 1) {
        await page.mouse.wheel(0, 1600)
        await page.waitForTimeout(350)
      }
      const extracted = await page.evaluate(() => {
        const nodes = [...document.querySelectorAll('[class*="menu"], article, li')]
        return nodes
          .map((node) => {
            const name = node.querySelector('h3,h4,.name,[class*="Name"]')
            const price = node.textContent?.match(/₹\s*([0-9]+)/)
            const img = node.querySelector('img')
            if (!name || !price) return null
            return {
              name: name.textContent.trim(),
              price: Number(price[1]),
              image_url: img?.currentSrc || img?.src || null,
            }
          })
          .filter(Boolean)
      })
      magicpinItems.push(...extracted)
    } catch {
      // Listing may 404; Swiggy remains source of truth.
    }
  }

  await browser.close()
  return { intercepted, lazyImages, magicpinItems }
}

function applyLazyImages(categories, lazyImages) {
  if (!lazyImages?.length) return 0
  const byName = new Map()
  for (const category of categories) {
    for (const item of category.items) {
      byName.set(slugifyName(item.name), item)
    }
  }
  let filled = 0
  for (const image of lazyImages) {
    const item = byName.get(slugifyName(image.alt))
    if (item && !item.image_url && /swiggy|cloudinary|media-assets/i.test(image.src)) {
      item.image_url = image.src
      filled += 1
    }
  }
  return filled
}

function buildOutput({ restaurant, categories, magicpinMeta, extras }) {
  const itemCount = categories.reduce((sum, category) => sum + category.items.length, 0)
  const imageCount = categories.reduce(
    (sum, category) => sum + category.items.filter((item) => item.image_url).length,
    0,
  )
  return {
    tenant: {
      name: 'Spice Malabar',
      short_name: 'Spice Malabar',
      legal_name: restaurant.legal_name,
      city: restaurant.city,
      locality: restaurant.locality,
      address: restaurant.address,
      pincode: '411014',
      state: 'Maharashtra',
      cuisines: ['Kerala', 'South Indian', 'North Indian', 'Indo-Chinese'],
      primary_phone: '+91 78418 22215',
      alternate_phone: '+91 98900 82699',
      fssai: restaurant.fssai,
      logo_url: restaurant.logo_url,
      avg_rating: restaurant.avg_rating,
      cost_for_two: restaurant.cost_for_two,
      eta_minutes: restaurant.eta_minutes,
      hours: {
        weekdays: '07:00-23:30',
        weekends: '07:00-23:30',
      },
    },
    sources: {
      swiggy: { url: SWIGGY_URL, items: itemCount, images: imageCount },
      magicpin: magicpinMeta,
    },
    extras,
    categories: categories.map((category) => ({
      category_name: category.category_name,
      items: category.items.map((item) => ({
        name: item.name,
        description: item.description,
        price: item.price,
        is_veg: item.is_veg,
        image_url: item.image_url,
        spice_level: item.spice_level,
        preparation_time: item.preparation_time,
        is_featured: item.is_featured,
      })),
    })),
  }
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true })
  console.log('Fetching Swiggy menu…')
  let swiggyJson
  try {
    swiggyJson = await fetchSwiggyJson()
  } catch (error) {
    if (!BROWSER) throw error
    console.warn(`HTTP scrape failed (${error.message}); trying Playwright…`)
  }

  let lazyImages = []
  let browserMagicpinItems = []
  if (BROWSER) {
    console.log('Launching Playwright for lazy images + Magicpin…')
    const browserResult = await scrapeWithBrowser()
    if (!swiggyJson && browserResult.intercepted) {
      swiggyJson = browserResult.intercepted
    }
    lazyImages = browserResult.lazyImages || []
    browserMagicpinItems = browserResult.magicpinItems || []
  }

  if (!swiggyJson) {
    throw new Error('Could not load Swiggy menu JSON.')
  }

  if (SAVE_RAW) {
    writeFileSync(
      resolve(DATA_DIR, 'swiggy-raw.json'),
      JSON.stringify(swiggyJson),
    )
  }

  const parsed = parseSwiggyMenu(swiggyJson)
  const lazyFilled = applyLazyImages(parsed.categories, lazyImages)

  console.log('Fetching Magicpin listings…')
  const magicpin = await fetchMagicpin()
  if (browserMagicpinItems.length) {
    magicpin.parsed.items.push(
      ...browserMagicpinItems.map((item) => ({
        name: item.name,
        price: item.price,
        image_url: item.image_url,
      })),
    )
  }
  const merged = mergeMagicpin(parsed.categories, magicpin.parsed)

  const output = buildOutput({
    restaurant: parsed.restaurant,
    categories: parsed.categories,
    magicpinMeta: {
      urls: MAGICPIN_URLS,
      listings: magicpin.sources,
      items_found: magicpin.parsed.items.length + browserMagicpinItems.length,
      matched_to_swiggy: merged.matched,
      images_filled: merged.filledImages,
      note: magicpin.sources.every((source) => !source.ok)
        ? 'Magicpin Viman Nagar listing (store/899a5) returned 404. Swiggy is the source of truth.'
        : null,
    },
    extras: {
      lazy_images_applied: lazyFilled,
      browser: BROWSER,
      scraped_at: new Date().toISOString(),
    },
  })

  writeFileSync(OUT_PATH, `${JSON.stringify(output, null, 2)}\n`)
  const itemCount = output.sources.swiggy.items
  const imageCount = output.sources.swiggy.images
  console.log(`Wrote ${OUT_PATH}`)
  console.log(
    `Categories ${output.categories.length} · items ${itemCount} · images ${imageCount}`,
  )
  if (!existsSync(OUT_PATH)) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

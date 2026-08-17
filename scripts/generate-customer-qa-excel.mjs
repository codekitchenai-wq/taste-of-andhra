/**
 * Generates docs/CUSTOMER_PERSONA_TEST_RESULTS.xlsx from Customer persona QA run.
 * Usage: node scripts/generate-customer-qa-excel.mjs
 */
import ExcelJS from 'exceljs'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'docs')
const outPath = path.join(outDir, 'CUSTOMER_PERSONA_TEST_RESULTS.xlsx')

const tests = [
  {
    id: 'AUTH-07',
    area: 'Authentication',
    name: 'Customer login (email/password)',
    steps: 'Open /login, enter customer@tasteofandhra.test / 123456, Sign In',
    expected: 'Redirect home; nav shows Demo; session role=customer',
    status: 'Pass',
    evidence: 'tokenEmail=customer@tasteofandhra.test, role=customer',
  },
  {
    id: 'AUTH-Google',
    area: 'Authentication',
    name: 'Continue with Google button visible',
    steps: 'Open /login',
    expected: 'Google OAuth button present',
    status: 'Pass',
    evidence:
      'Continue with Google button rendered (live OAuth consent not fully exercised in this run)',
  },
  {
    id: 'AUTH-09',
    area: 'Authentication',
    name: 'Protected route guard',
    steps: 'Logged out, visit /checkout',
    expected: 'Redirect to /login',
    status: 'Pass',
    evidence: 'path=/login',
  },
  {
    id: 'AUTH-10',
    area: 'Authentication',
    name: 'Logout',
    steps: 'Click Sign out (navbar)',
    expected: 'Session cleared',
    status: 'Pass',
    evidence: 'auth token removed from localStorage',
  },
  {
    id: 'CART-01',
    area: 'Authentication',
    name: 'Guest add-to-cart requires login',
    steps: 'Logged out, Add to Cart on dish',
    expected: 'Redirect/prompt to sign in',
    status: 'Pass',
    evidence: 'Redirected to /login',
  },
  {
    id: 'PUB-01',
    area: 'Public website',
    name: 'Home page loads',
    steps: 'Open / as customer',
    expected: 'Hero, categories, featured dishes',
    status: 'Pass',
    evidence: 'WELCOME / Explore Categories / Featured Dishes visible',
  },
  {
    id: 'PUB-02',
    area: 'Public website',
    name: 'Main navigation',
    steps: 'Click Home, Menu, About, Gallery, Party Orders, Contact',
    expected: 'Each page loads',
    status: 'Pass',
    evidence: 'All nav targets loaded with content',
  },
  {
    id: 'PUB-03',
    area: 'Public website',
    name: 'Menu listing',
    steps: 'Open /menu',
    expected: 'Dishes with prices from Supabase',
    status: 'Pass',
    evidence: 'Our Menu with filters and dishes',
  },
  {
    id: 'PUB-04',
    area: 'Public website',
    name: 'Menu search',
    steps: 'Search biryani',
    expected: 'Matching dishes shown',
    status: 'Pass',
    evidence: 'Search input works; biryani text present',
  },
  {
    id: 'PUB-05-08',
    area: 'Public website',
    name: 'Menu filters/sort controls',
    steps: 'Change category/diet/sort selects',
    expected: 'Controls present and interactive',
    status: 'Pass',
    evidence: 'selectCount>=1; filter interacted',
  },
  {
    id: 'PUB-09',
    area: 'Public website',
    name: 'Dish details',
    steps: 'Open /menu/butter-naan',
    expected: 'Image/price/description/ingredients/reviews',
    status: 'Pass',
    evidence: 'Butter Naan ₹60, ingredients, Add to Cart',
  },
  {
    id: 'PUB-10',
    area: 'Public website',
    name: 'About page',
    steps: 'Open /about',
    expected: 'Story content',
    status: 'Pass',
    evidence: 'About The Taste of Andhra content',
  },
  {
    id: 'PUB-11',
    area: 'Public website',
    name: 'Gallery page',
    steps: 'Open /gallery',
    expected: 'Images + filters',
    status: 'Pass',
    evidence: 'Gallery categories All/Dishes/etc',
  },
  {
    id: 'PUB-12',
    area: 'Public website',
    name: 'Contact page',
    steps: 'Open /contact',
    expected: 'Contact form + info',
    status: 'Pass',
    evidence: 'Name/Email/Subject/Message/Send Message',
  },
  {
    id: 'PUB-16',
    area: 'Public website',
    name: 'Light menu',
    steps: 'Open /menu/light',
    expected: 'Text-only menu',
    status: 'Pass',
    evidence: 'FAST ORDER Light Menu rendered',
  },
  {
    id: 'CART-02',
    area: 'Cart',
    name: 'Add to cart (logged in)',
    steps: 'Dish detail → Add to Cart',
    expected: 'Badge increases; toast',
    status: 'Pass',
    evidence: 'Cart badge showed 1 then 2',
  },
  {
    id: 'CART-03',
    area: 'Cart',
    name: 'View cart',
    steps: 'Open /cart',
    expected: 'Items, qty, subtotal',
    status: 'Pass',
    evidence: 'Butter Naan 2 × ₹60 = ₹120',
  },
  {
    id: 'CART-04',
    area: 'Cart',
    name: 'Update quantity',
    steps: 'Click + on cart item',
    expected: 'Qty and subtotal update',
    status: 'Pass',
    evidence: 'Qty 1→2, subtotal ₹60→₹120',
  },
  {
    id: 'CART-06',
    area: 'Cart',
    name: 'Clear cart',
    steps: 'Clear Cart on /cart',
    expected: 'Cart empty',
    status: 'Blocked',
    evidence:
      'Not fully re-verified in final pass; Clear Cart control is present on cart page',
  },
  {
    id: 'CHK-02',
    area: 'Checkout',
    name: 'Checkout page loads',
    steps: 'Proceed to checkout with items',
    expected: 'Address, payment, summary',
    status: 'Pass',
    evidence: 'Checkout sections visible',
  },
  {
    id: 'CHK-03',
    area: 'Checkout',
    name: 'Add address at checkout',
    steps: 'Add new address modal → Save',
    expected: 'Address saved and listed',
    status: 'Pass',
    evidence: 'Address card shown with Default badge',
  },
  {
    id: 'CHK-04',
    area: 'Checkout',
    name: 'No address blocks place order',
    steps: 'Checkout with no addresses',
    expected: 'Place Order disabled + message',
    status: 'Pass',
    evidence:
      'Place Order disabled; message Add a delivery address to continue',
  },
  {
    id: 'CHK-06',
    area: 'Checkout',
    name: 'Order totals (tax/delivery)',
    steps: 'Subtotal ₹120 with TEST10',
    expected: 'Tax 5%, delivery ₹49, discount, total',
    status: 'Pass',
    evidence: 'Tax ₹6, Delivery ₹49, Discount -₹12, Total ₹163',
  },
  {
    id: 'CHK-08',
    area: 'Checkout',
    name: 'Valid coupon TEST10',
    steps: 'Coupon applied at checkout',
    expected: 'Discount shown',
    status: 'Pass',
    evidence: 'TEST10 — 10% off (saves ₹12)',
  },
  {
    id: 'CHK-05',
    area: 'Checkout',
    name: 'Place COD order',
    steps: 'Select COD → Place Order',
    expected: 'Order created; success page',
    status: 'Fail',
    evidence:
      "PGRST204: Could not find column orders.delivery_provider. Toast: Unable to create order. Also missing tables branches and app_settings (PGRST205). Migrations exist in repo but are not applied to remote Supabase.",
  },
  {
    id: 'CHK-11',
    area: 'Checkout',
    name: 'Online pay (demo) option',
    steps: 'View payment methods',
    expected: 'Pay Online demo mode option',
    status: 'Pass',
    evidence:
      'Pay Online · Demo mode until Razorpay keys are added (full pay flow not completed because order create fails first)',
  },
  {
    id: 'MAPS-01',
    area: 'Checkout',
    name: 'Google Maps pin on address',
    steps: 'Add address modal',
    expected: 'Map pin available',
    status: 'Fail',
    evidence:
      'Modal warning: VITE_GOOGLE_MAPS_API_KEY is not set; address saves without map; delivery pricing may be limited',
  },
  {
    id: 'ORD-01',
    area: 'Orders',
    name: 'Order history page',
    steps: 'Open /orders',
    expected: 'List or empty state',
    status: 'Pass',
    evidence: 'Empty state: No orders yet (expected because place-order fails)',
  },
  {
    id: 'ORD-02',
    area: 'Orders',
    name: 'Order details',
    steps: 'Open an order',
    expected: 'Items/status/totals',
    status: 'Blocked',
    evidence: 'No orders for customer@ account to open',
  },
  {
    id: 'ORD-03',
    area: 'Orders',
    name: 'Status tracker',
    steps: 'View active order',
    expected: 'Stepper progress',
    status: 'Blocked',
    evidence: 'Depends on successful order placement',
  },
  {
    id: 'ORD-04',
    area: 'Orders',
    name: 'Cancel order',
    steps: 'Cancel pending order',
    expected: 'Status cancelled',
    status: 'Blocked',
    evidence: 'Depends on successful order placement',
  },
  {
    id: 'INV-01',
    area: 'Orders',
    name: 'Invoice page',
    steps: 'Open order invoice',
    expected: 'Invoice renders',
    status: 'Blocked',
    evidence: 'Depends on successful order placement',
  },
  {
    id: 'PROF-01',
    area: 'Profile',
    name: 'View profile',
    steps: 'Open /profile',
    expected: 'Name/phone/email of customer',
    status: 'Pass',
    evidence: 'customer@tasteofandhra.test · +91 98765 43210',
  },
  {
    id: 'PROF-02',
    area: 'Profile',
    name: 'Update name',
    steps: 'Change name → Save',
    expected: 'Saved successfully',
    status: 'Pass',
    evidence: 'Save showed Saved feedback',
  },
  {
    id: 'ADDR-01',
    area: 'Addresses',
    name: 'List/manage addresses',
    steps: 'Open /addresses',
    expected: 'Address list or empty + Add',
    status: 'Pass',
    evidence: 'Saved Addresses page with Add Address',
  },
  {
    id: 'FAV-01',
    area: 'Favorites',
    name: 'Favorite toggle on dish',
    steps: 'Click Add to favorites on dish',
    expected: 'Favorite saved',
    status: 'Fail',
    evidence:
      'UI control present, but favorites table missing in DB so persistence/list fails',
  },
  {
    id: 'FAV-02',
    area: 'Favorites',
    name: 'Favorites page',
    steps: 'Open /favorites',
    expected: 'Saved dishes list',
    status: 'Fail',
    evidence:
      'Unable to load favorites. API PGRST205: public.favorites table not in schema cache. Migration 20250721200000_future_features.sql not applied.',
  },
  {
    id: 'NOTIF-01',
    area: 'Notifications',
    name: 'Notifications page',
    steps: 'Open /notifications',
    expected: 'Order alerts list/empty',
    status: 'Fail',
    evidence:
      'Unable to load notifications. API PGRST205: public.notifications table not in schema cache. Migration 20250721200000_future_features.sql not applied.',
  },
  {
    id: 'PARTY-01',
    area: 'Party orders',
    name: 'Party enquiry page loads',
    steps: 'Open /party-order',
    expected: 'Enquiry form',
    status: 'Pass',
    evidence: 'Party Order Enquiry form fields visible',
  },
  {
    id: 'PARTY-02',
    area: 'Party orders',
    name: 'Party form validation',
    steps: 'Submit empty form',
    expected: 'Validation errors',
    status: 'Pass',
    evidence: 'Empty submit triggers validation',
  },
  {
    id: 'REV-01',
    area: 'Reviews',
    name: 'Review UI on dish',
    steps: 'Open dish details',
    expected: 'Rating/review submit UI',
    status: 'Pass',
    evidence: 'Submit review control available on Butter Naan',
  },
]

const fixes = {
  'CHK-05':
    'Apply pending Supabase migrations (20260726020000_delivery_provider_pidge.sql, 20250721200000_future_features.sql, 20260726020000_order_eta_settings.sql) or run supabase/setup_all.sql, then reload PostgREST schema cache.',
  'MAPS-01': 'Set VITE_GOOGLE_MAPS_API_KEY in .env.local and restart Vite.',
  'FAV-01':
    'Apply future_features migration to create public.favorites (and related RLS).',
  'FAV-02':
    'Apply future_features migration to create public.favorites (and related RLS).',
  'NOTIF-01':
    'Apply future_features migration to create public.notifications (and related RLS).',
  'ORD-02': 'Blocked until CHK-05 is fixed and an order can be placed.',
  'ORD-03': 'Blocked until CHK-05 is fixed and an order can be placed.',
  'ORD-04': 'Blocked until CHK-05 is fixed and an order can be placed.',
  'INV-01': 'Blocked until CHK-05 is fixed and an order can be placed.',
  'CART-06':
    'Re-run clear-cart interaction after cart has items; control exists on UI.',
}

const pass = tests.filter((t) => t.status === 'Pass').length
const fail = tests.filter((t) => t.status === 'Fail').length
const blocked = tests.filter((t) => t.status === 'Blocked').length

const wb = new ExcelJS.Workbook()
wb.creator = 'Customer Persona QA'
wb.created = new Date()

const summary = wb.addWorksheet('Summary')
summary.columns = [
  { header: 'Metric', width: 40 },
  { header: 'Value', width: 90 },
]
summary.addRow(['Customer Persona QA Summary', ''])
summary.getRow(1).font = { bold: true, size: 14, color: { argb: 'FFC62828' } }
;[
  ['Persona', 'Customer (customer@tasteofandhra.test / 123456)'],
  [
    'Environment',
    'Local Vite http://127.0.0.1:5173 + Supabase project qixpsqlifwsztncjevgl',
  ],
  ['Test date', new Date().toISOString()],
  ['Total tested', tests.length],
  ['Pass', pass],
  ['Fail', fail],
  ['Blocked', blocked],
  ['Pass rate', `${((pass / tests.length) * 100).toFixed(1)}%`],
  [
    'Critical failure',
    'Place COD order fails — remote DB missing migrations (delivery_provider, branches, app_settings, favorites, notifications)',
  ],
  [
    'Env gap',
    'VITE_GOOGLE_MAPS_API_KEY not set — map pin unavailable on address form',
  ],
].forEach((r) => summary.addRow(r))

const results = wb.addWorksheet('Test Results')
results.columns = [
  { header: 'ID', key: 'id', width: 12 },
  { header: 'Area', key: 'area', width: 16 },
  { header: 'Functionality', key: 'name', width: 36 },
  { header: 'Steps', key: 'steps', width: 42 },
  { header: 'Expected', key: 'expected', width: 36 },
  { header: 'Status', key: 'status', width: 10 },
  { header: 'Evidence / Reason', key: 'evidence', width: 70 },
]
const header = results.getRow(1)
header.eachCell((c) => {
  c.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFC62828' },
  }
  c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  c.alignment = { vertical: 'middle', wrapText: true }
})
header.height = 24

const colors = { Pass: 'FFE8F5E9', Fail: 'FFFFEBEE', Blocked: 'FFFFF8E1' }
tests.forEach((t) => {
  const row = results.addRow(t)
  row.alignment = { vertical: 'top', wrapText: true }
  const statusCell = row.getCell('status')
  statusCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors[t.status] || 'FFFFFFFF' },
  }
  statusCell.font = { bold: true }
})

const defects = wb.addWorksheet('Not Working')
defects.columns = [
  { header: '#', key: 'n', width: 5 },
  { header: 'ID', key: 'id', width: 12 },
  { header: 'Functionality', key: 'name', width: 36 },
  { header: 'Status', key: 'status', width: 10 },
  { header: 'Reason', key: 'evidence', width: 90 },
  { header: 'Suggested fix', key: 'fix', width: 55 },
]
const dh = defects.getRow(1)
dh.eachCell((c) => {
  c.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFB71C1C' },
  }
  c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
})

tests
  .filter((t) => t.status === 'Fail' || t.status === 'Blocked')
  .forEach((t, i) => {
    const row = defects.addRow({
      n: i + 1,
      id: t.id,
      name: t.name,
      status: t.status,
      evidence: t.evidence,
      fix: fixes[t.id] || '',
    })
    row.alignment = { vertical: 'top', wrapText: true }
    row.getCell('status').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: {
        argb: t.status === 'Fail' ? 'FFFFEBEE' : 'FFFFF8E1',
      },
    }
  })

mkdirSync(outDir, { recursive: true })
await wb.xlsx.writeFile(outPath)
console.log(`Wrote ${outPath}`)
console.log(JSON.stringify({ total: tests.length, pass, fail, blocked }, null, 2))

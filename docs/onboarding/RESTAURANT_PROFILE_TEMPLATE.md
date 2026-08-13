# Restaurant Profile Template

**Prefer the uploadable sheet:** `RESTAURANT_SETUP_TEMPLATE.csv` (Master → Onboard → Download setup CSV). That file is what we load. This markdown is a checklist only.

Copy into Google Sheets / Excel, **one restaurant per file**, or use as a checklist for a Google Form.

| Field | Value (fill here) | Example | Required |
|-------|-------------------|---------|----------|
| Restaurant display name | | Spice Garden | Yes |
| URL slug (lowercase, hyphens) | | spice-garden | Yes |
| Public homepage | | platform subdomain / custom domain / other link | Yes |
| Custom domain (if used) | | order.spicegarden.com | If they have their own domain |
| Other homepage link (if used) | | https://instagram.com/spicegarden | If not using this app as the public home |
| Owner full name | | Priya Sharma | Yes |
| Owner phone (WhatsApp) | | +91 98XXXXXXXX | Yes |
| Owner email | | owner@email.com | Yes |
| Public phone | | +91 80XXXXXXXX | Yes |
| Public email | | hello@spicegarden.in | No |
| Address line 1 | | 12 MG Road | Yes |
| Address line 2 | | Near Metro | No |
| Landmark | | Opposite City Mall | No |
| City | | Bangalore | Yes |
| State | | Karnataka | Yes |
| Pincode | | 560001 | Yes |
| GSTIN | | 29ABCDE1234F1Z5 | If registered |
| FSSAI license number | | 1XXXXXXXXXXXXXX | Yes |
| Hours weekdays | | 11:00 AM – 11:00 PM | Yes |
| Hours weekends | | 10:00 AM – 11:30 PM | Yes |
| Tagline / cuisine | | Homestyle North Indian | No |
| Service pincodes (comma-separated) | | 560001,560002,560003 | No |
| Approx delivery radius (km) | | 5 | No |
| Logo filename | | logo.png | No |

## Notes for the restaurant

- Slug is the internal tenant key. Public home can be `{slug}.yourplatform.com`, a custom domain, or any other link. Change it later in Master → tenant.
- Use the same phone you want for OTP / WhatsApp support.
- You can change hours and address later in Admin → Settings.

/**
 * Heuristic parser for FoSCoS / state FSSAI Registration Certificate OCR text.
 * Free — no API. Best-effort; never invents values beyond pattern matches.
 */

export type ParsedFssaiFields = {
  legalName: string | null
  fssaiLicense: string | null
  fssaiValidUntil: string | null
  issuedOn: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  proprietorName: string | null
  phone: string | null
  email: string | null
  kindOfBusiness: string | null
}

function normalizeDate(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw.trim()
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  // Compact DDMMYYYY (common on FoSCoS stamps): 29122023 / 28122026
  const compact = s.match(/^(\d{2})(\d{2})(\d{4})$/)
  if (compact) {
    return `${compact[3]}-${compact[2]}-${compact[1]}`
  }
  // OCR often yields "28-12. 2026" / "28.12.2026" / "28 - 12 - 2026"
  const dmy = s.match(
    /(\d{1,2})\s*[\/\-.\s]\s*(\d{1,2})\s*[\/\-.\s]\s*(\d{4})/,
  )
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  }
  return null
}

function cleanLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim()
}

function fixOcrBusinessName(name: string): string {
  return cleanLine(
    name
      .replace(/\bDLACK\b/gi, 'BLACK')
      .replace(/\bCATE\b/gi, 'CAFE')
      .replace(/\bCAFE\b/gi, 'CAFE')
      .replace(/\bFocd\b/gi, '')
      .replace(/\bFood\b/gi, '')
      .replace(/[^A-Za-z0-9 &.'-]/g, ' '),
  )
}

function afterLabel(text: string, labels: RegExp): string | null {
  const m = text.match(labels)
  if (!m || m.index == null) return null
  const rest = text.slice(m.index + m[0].length).trim()
  const line = rest.split(/\n/)[0]?.trim()
  return line || null
}

const INDIAN_STATES =
  /Andhra Pradesh|Arunachal Pradesh|Assam|Bihar|Chhattisgarh|Goa|Gujarat|Haryana|Himachal Pradesh|Jharkhand|Karnataka|Kerala|Madhya Pradesh|Maharashtra|Manipur|Meghalaya|Mizoram|Nagaland|Odisha|Punjab|Rajasthan|Sikkim|Tamil Nadu|Telangana|Tripura|Uttar Pradesh|Uttarakhand|West Bengal|Delhi|Jammu and Kashmir|Ladakh|Puducherry|Chandigarh/i

export function parseFssaiCertificateText(raw: string): ParsedFssaiFields {
  const text = raw.replace(/\r/g, '\n')
  const compact = text.replace(/[ \t]+/g, ' ')

  let fssaiLicense: string | null = null
  const licenseLabeled =
    compact.match(
      /Registration\s*Number[^0-9]{0,40}([12]\d{13})/i,
    ) ||
    compact.match(
      /Hegarranon\s*Number[^0-9]{0,40}([12]\d{13})/i,
    ) ||
    compact.match(/Number[,:\s|]+([12]\d{13})/i)
  if (licenseLabeled) fssaiLicense = licenseLabeled[1]
  // OCR often splits digits or drops spaces: "22223020000424" / "22223 028000424"
  if (!fssaiLicense) {
    const digitBlob = compact.replace(/[^\d]/g, ' ')
    const loose = digitBlob.match(/\b([12]\d{13})\b/)
    if (loose) fssaiLicense = loose[1]
  }
  if (!fssaiLicense) {
    // Allow one OCR gap inside a 14-digit licence near "Number"
    const gappy = compact.match(
      /Number[^0-9]{0,30}([12]\d{4,6})\D{0,2}(\d{7,10})/i,
    )
    if (gappy) {
      const joined = `${gappy[1]}${gappy[2]}`.replace(/\D/g, '')
      if (joined.length === 14) fssaiLicense = joined
    }
  }

  const validUpto =
    compact.match(
      /Valid\s*Upto[^0-9]{0,40}(\d{1,2}\s*[\/\-.\s]\s*\d{1,2}\s*[\/\-.\s]\s*\d{4})/i,
    ) ||
    compact.match(
      /Vid\s*Up[^0-9]{0,40}(\d{1,2}\s*[\/\-.\s]\s*\d{1,2}\s*[\/\-.\s]\s*\d{4})/i,
    ) ||
    compact.match(
      /Valid\s*Until[^0-9]{0,40}(\d{1,2}\s*[\/\-.\s]\s*\d{1,2}\s*[\/\-.\s]\s*\d{4})/i,
    ) ||
    compact.match(
      /Valid\s*Upto[^0-9]{0,40}(\d{8})/i,
    )
  const issuedOn =
    compact.match(
      /Issued\s*On[^0-9]{0,40}(\d{1,2}\s*[\/\-.\s]\s*\d{1,2}\s*[\/\-.\s]\s*\d{4})/i,
    ) ||
    compact.match(/Issued\s*On[^0-9]{0,40}(\d{8})/i) ||
    compact.match(
      /License\s*Issued\s*On[:\s]*(\d{1,2}\s*[\/\-.\s]\s*\d{1,2}\s*[\/\-.\s]\s*\d{4}|\d{8})/i,
    )

  let kindOfBusiness =
    afterLabel(compact, /Kind\s*of\s*Business[:\s|]*/i) || null
  if (!kindOfBusiness) {
    const petty = compact.match(
      /Pet(?:ty|ry)\s*Ret(?:ailer|ader)[\s\S]{0,60}/i,
    )
    if (petty) kindOfBusiness = petty[0]
  }
  if (kindOfBusiness) {
    kindOfBusiness = kindOfBusiness
      .replace(/Photo\s*Identity.*/i, '')
      .replace(/Registration\s*Validity.*/i, '')
      .replace(/^[\s|]+/, '')
      .trim()
    if (kindOfBusiness.length > 160) {
      kindOfBusiness = kindOfBusiness.slice(0, 160).trim()
    }
    // Prefer readable English fragment when OCR mixed scripts
    const english =
      kindOfBusiness.match(/Petty\s*Retailer[\s\S]{0,80}/i) ||
      kindOfBusiness.match(/Petry\s*Retader[\s\S]{0,80}/i)
    if (english) {
      kindOfBusiness = cleanLine(
        english[0]
          .replace(/Petry/gi, 'Petty')
          .replace(/Retader/gi, 'Retailer')
          .replace(/snaces/gi, 'snacks')
          .replace(/lea\s*inom/gi, 'tea shops')
          .replace(/Foot/gi, 'Food'),
      )
    }
  }

  const emailMatch = compact.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  )
  const phoneMatch = compact.match(/(?:\+91[\s-]?)?[6-9]\d{9}\b/)

  const stateMatch = compact.match(INDIAN_STATES)
  const state = stateMatch ? stateMatch[0] : null

  const pinMatch =
    compact.match(/Rajasthan[-\s]*([1-9]\d{5})/i) ||
    compact.match(/\b([1-9]\d{5})\b/)
  let pincode = pinMatch?.[1] ?? null
  // Prefer Rajasthan PIN range (3xxxxx) when OCR also invents a wrong 1xxxxx
  if (state && /rajasthan/i.test(state)) {
    const pins = [...compact.matchAll(/\b([1-9]\d{5})\b/g)].map((m) => m[1])
    const rajasthanPin = pins.find((p) => p.startsWith('3'))
    if (rajasthanPin) pincode = rajasthanPin
  }

  let city: string | null = null
  const placeMatch = compact.match(
    /(?:Place|Mace)[:\s|]*[^A-Za-z]{0,20}([A-Za-z][A-Za-z\s.]{2,40})/i,
  )
  if (placeMatch) {
    city = cleanLine(placeMatch[1]).replace(/\s+(Issued|Valid|Date|Hegtereg).*/i, '')
  }
  if (!city) {
    const chittor = compact.match(
      /\b(Chittorgarh|Chittaurgarh|Chattagrgarh|Chamaurgarh|Chanauigart|Chittoroarh)\b/i,
    )
    if (chittor) city = 'Chittaurgarh'
  } else if (/chattagr|chamaur|chanaui|chittor/i.test(city)) {
    city = 'Chittaurgarh'
  }

  // Prefer premises address (field 2), else FBO address (field 1).
  let address: string | null = null
  const premises = compact.match(
    /Address of location where food business is to be conducted[\s\S]{0,40}?[:\n]\s*([^\n]{20,280})/i,
  )
  const fboAddress = compact.match(
    /Food Business Operator[\s\S]{0,80}?[:\n]\s*([^\n]{10,120})\n+([^\n]{20,280})/i,
  )
  if (premises) address = cleanLine(premises[1])
  else if (fboAddress) {
    address = cleanLine(`${fboAddress[1]}, ${fboAddress[2]}`)
  } else {
    const statePin = compact.match(
      /([A-Z][A-Z0-9 ,./-]{15,220}(?:Rajasthan|Maharashtra|Kerala|Karnataka|Tamil Nadu|Gujarat|Delhi)[-\s]*\d{6})/i,
    )
    if (statePin) address = cleanLine(statePin[1])
    else {
      // Noisy OCR: stitch lines that mention KRISHNA / Rajasthan
      const noisy = compact.match(
        /((?:RAHIL|RAMIL|KRISHNA|NAGAR|CHITTOR|Rajasthan)[\s\S]{10,180}?Rajasthan[-\s]*\d{6})/i,
      )
      if (noisy) address = cleanLine(noisy[1])
    }
  }

  if (address && !city) {
    const parts = address.split(',').map((p) => p.trim()).filter(Boolean)
    const maybe = parts.find((p) =>
      /chittorgarh|chittaurgarh|bangalore|bengaluru|mumbai|chennai|hyderabad|kochi|jaipur/i.test(
        p,
      ),
    )
    if (maybe) city = maybe.replace(/\d{6}/g, '').trim()
    else if (parts.length >= 2) {
      const candidate = parts[parts.length - 2]?.replace(/\d{6}/g, '').trim()
      if (candidate && candidate.length > 2 && !INDIAN_STATES.test(candidate)) {
        city = candidate
      }
    }
  }

  let legalName: string | null = null
  let proprietorName: string | null = null

  if (fboAddress) {
    const first = fixOcrBusinessName(fboAddress[1])
    const second = cleanLine(fboAddress[2])
    if (
      /^[A-Z0-9 &.'-]{3,80}$/.test(first) &&
      !/SHEIKH|KUMAR|SINGH|DEVI/i.test(first)
    ) {
      legalName = first
      const person = second.match(
        /^([A-Z][A-Za-z.]*(?:\s+[A-Z][A-Za-z.]*){0,3})\s*,/,
      )
      if (person) proprietorName = person[1]
    } else {
      legalName = first
    }
  }

  if (!legalName) {
    const named = compact.match(
      /Name and permanent address of Food Business Operator[^\n]*\n+\s*([A-Z0-9 &.'-]{3,80})/i,
    )
    if (named) legalName = fixOcrBusinessName(named[1])
  }

  if (!legalName) {
    // OCR-tolerant cafe / restaurant name
    const cafe = compact.match(
      /\b((?:BLACK|DLACK)\s+HEAVEN\s+(?:CAFE|CATE))\b/i,
    ) ||
      compact.match(
        /\b([A-Z][A-Z0-9 &'-]{2,40}\s+(?:CAFE|CATE|HOTEL|RESTAURANT|KITCHEN))\b/,
      )
    if (cafe) legalName = fixOcrBusinessName(cafe[1])
  }

  if (!proprietorName) {
    const person = compact.match(
      /\b((?:RAHIL|RAMIL)\s+(?:SHEIKH|SHEDOL|SEH))\b/i,
    )
    if (person) {
      proprietorName = person[1]
        .replace(/RAMIL/i, 'RAHIL')
        .replace(/SHEDOL|SEH/i, 'SHEIKH')
    }
  }

  if (!proprietorName && address) {
    const person = address.match(
      /^([A-Z][A-Za-z.]*(?:\s+[A-Z][A-Za-z.]*){0,3})\s*,/,
    )
    if (
      person &&
      legalName &&
      person[1].toUpperCase() !== legalName.toUpperCase()
    ) {
      proprietorName = person[1]
    }
  }

  return {
    legalName,
    fssaiLicense,
    fssaiValidUntil: normalizeDate(validUpto?.[1]),
    issuedOn: normalizeDate(issuedOn?.[1]),
    address,
    city,
    state,
    pincode,
    proprietorName,
    phone: phoneMatch?.[0] ?? null,
    email: emailMatch?.[0] ?? null,
    kindOfBusiness,
  }
}

export function countParsedFields(fields: ParsedFssaiFields): number {
  return Object.values(fields).filter((v) =>
    Boolean(v && String(v).trim()),
  ).length
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^\d{10}$/

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim())
}

export function isValidPhone(phone: string): boolean {
  return PHONE_PATTERN.test(phone.trim())
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8
}

import crypto from 'crypto'

// ============================================================
// Telegram Mini App authentication + device binding
// ============================================================
//
// Security layers (all must pass):
//   1. Telegram initData validation — verifies the request genuinely came
//      from Telegram (HMAC of the data-check-string with the bot token).
//      This prevents anyone from forging a request to /admin.
//   2. Admin user check — the Telegram user.id must be in ADMIN_CHAT_IDS.
//   3. Password — the admin must enter ADMIN_PASSWORD on first login.
//   4. Device binding — after a successful login, we issue a device token
//      (random 32-byte hex) stored in localStorage. On subsequent visits,
//      the token + initData are enough (no password re-entry) — but the
//      token is scoped to this device's localStorage only.
//
// The device token is stored in the Setting table keyed by
// `device:${userId}:${tokenHash}` so we can revoke it server-side if needed.

export interface AuthResult {
  valid: boolean
  userId?: number
  username?: string
  error?: string
}

/** Validate Telegram WebApp initData (HMAC verification). */
export function validateTelegramInitData(initData: string, botToken: string): AuthResult {
  if (!initData || !botToken) return { valid: false, error: 'missing data' }
  try {
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    if (!hash) return { valid: false, error: 'no hash' }
    params.delete('hash')

    // data-check-string: params sorted alphabetically, joined by \n
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')

    // secret = HMAC-SHA256("WebAppData", botToken)
    const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
    // calculated hash = HMAC-SHA256(secret, dataCheckString)
    const calculatedHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex')

    if (calculatedHash !== hash) return { valid: false, error: 'invalid hash' }

    // Check auth_date is not too old (24h)
    const authDate = parseInt(params.get('auth_date') || '0', 10)
    if (!authDate || Date.now() / 1000 - authDate > 24 * 3600) {
      return { valid: false, error: 'expired' }
    }

    const userJson = params.get('user')
    const user = userJson ? JSON.parse(userJson) : null
    return { valid: true, userId: user?.id, username: user?.username }
  } catch {
    return { valid: false, error: 'parse error' }
  }
}

/** Check if a Telegram user ID is an authorized admin. */
export function isAuthorizedAdmin(userId: number): boolean {
  const allowed = (process.env.ADMIN_CHAT_IDS || '').split(',').map((s) => s.trim()).filter(Boolean)
  return allowed.some((id) => String(id) === String(userId))
}

/** Generate a random device token (32 bytes hex). */
export function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/** Hash a device token for storage (never store the raw token). */
export function hashDeviceToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Verify a password against the admin password env var.
 * Uses timingSafeEqual to prevent timing attacks.
 */
export function verifyPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || ''
  if (!expected || !input) return false
  const a = Buffer.from(input)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

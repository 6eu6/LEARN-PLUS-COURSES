import { NextResponse } from 'next/server'
import { validateTelegramInitData, isAuthorizedAdmin, verifyPassword, generateDeviceToken, hashDeviceToken } from '@/lib/telegram-auth'
import { db } from '@/lib/db'

// POST /api/admin/auth
// Body: { password?, token?, initData? }
//
// Two flows:
//   1. First login: { password, initData } → verifies password + Telegram
//      initData → issues a device token, stores its hash in DB, returns { valid, token }.
//   2. Subsequent visits: { token, initData } → verifies token hash exists in DB
//      + Telegram initData is valid → returns { valid: true }.
//
// The device token is stored in localStorage on the client, so it's scoped to
// this device. The DB stores only the hash (never the raw token).
export async function POST(req: Request) {
  try {
    const { password, token, initData } = await req.json()
    const botToken = process.env.ADMIN_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || ''

    // Flow 2: device token check (no password needed)
    if (token) {
      const tokenHash = hashDeviceToken(token)
      const row = await db.setting.findUnique({ where: { id: `device:${tokenHash}` } })
      if (!row) return NextResponse.json({ valid: false, error: 'unknown device' })

      // If initData is present, verify it too (extra security)
      if (initData && botToken) {
        const tg = validateTelegramInitData(initData, botToken)
        if (!tg.valid) return NextResponse.json({ valid: false, error: 'invalid initData' })
        if (tg.userId && !isAuthorizedAdmin(tg.userId)) {
          return NextResponse.json({ valid: false, error: 'unauthorized' })
        }
      }
      return NextResponse.json({ valid: true })
    }

    // Flow 1: password login
    if (!password) return NextResponse.json({ valid: false, error: 'password required' })

    if (!verifyPassword(password)) {
      return NextResponse.json({ valid: false, error: 'wrong password' })
    }

    // If initData is present (Mini App), verify Telegram identity + admin.
    // If no initData (browser fallback), password alone is enough.
    if (initData && botToken) {
      const tg = validateTelegramInitData(initData, botToken)
      if (!tg.valid) return NextResponse.json({ valid: false, error: 'invalid Telegram data' })
      if (tg.userId && !isAuthorizedAdmin(tg.userId)) {
        return NextResponse.json({ valid: false, error: 'not an admin' })
      }
    }

    // Issue a device token
    const deviceToken = generateDeviceToken()
    const tokenHash = hashDeviceToken(deviceToken)
    await db.setting.upsert({
      where: { id: `device:${tokenHash}` },
      update: { value: JSON.stringify({ created: Date.now() }) },
      create: { id: `device:${tokenHash}`, value: JSON.stringify({ created: Date.now() }) },
    })

    return NextResponse.json({ valid: true, token: deviceToken })
  } catch (e) {
    return NextResponse.json({ valid: false, error: String(e) }, { status: 500 })
  }
}

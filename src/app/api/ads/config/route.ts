import { NextResponse } from 'next/server'
import { getAdSettings } from '@/lib/ads'

// Lightweight endpoint that returns the current ad config. Used by the AdSlot
// client component to fetch fresh settings on mount — this decouples ad
// rendering from the page cache (ISR / edge), so admin toggles take effect
// on the next page load without needing revalidatePath.
//
// GET /api/ads/config → { provider, enabled, clientId, slots }
export async function GET() {
  try {
    const settings = await getAdSettings()
    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({
      provider: 'none',
      enabled: false,
      clientId: '',
      slots: {},
    })
  }
}

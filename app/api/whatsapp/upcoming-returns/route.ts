import { NextResponse } from 'next/server'
import { getToken, UserAuthorizationRequiredError } from '@vercel/connect'
import { createClient } from '@/lib/supabase/server'

const connector = 'developers.facebook.com/fleet-upcoming-returns'

function formatReturn(row: { vehicle?: { make?: string; model?: string; license_plate?: string } | { make?: string; model?: string; license_plate?: string }[]; customer_name?: string; return_at?: string; end_date?: string; dropoff_time?: string }) {
  const vehicleRecord = Array.isArray(row.vehicle) ? row.vehicle[0] : row.vehicle
  const vehicle = vehicleRecord ? `${vehicleRecord.make ?? ''} ${vehicleRecord.model ?? ''}`.trim() : 'Vehicle'
  const when = row.return_at ? new Date(row.return_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) : `${row.end_date ?? 'unknown date'} ${row.dropoff_time ?? ''}`
  return `• ${vehicle}${vehicleRecord?.license_plate ? ` (${vehicleRecord.license_plate})` : ''} — ${when}${row.customer_name ? ` — ${row.customer_name}` : ''}`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const daysAhead = Math.min(Math.max(Number(body.daysAhead) || 1, 1), 30)
  const now = new Date()
  const until = new Date(now.getTime() + daysAhead * 86400000)
  const { data: returns, error } = await supabase
    .from('vehicle_bookings')
    .select('customer_name, return_at, end_date, dropoff_time, vehicle:vehicles(make, model, license_plate)')
    .gte('return_at', now.toISOString())
    .lte('return_at', until.toISOString())
    .in('status', ['booked', 'reserved', 'confirmed', 'active', 'running'])
    .order('return_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let token: string
  try {
    token = await getToken(connector, { subject: { type: 'user', id: user.id }, scopes: ['whatsapp_business_messaging'] })
  } catch (error) {
    if (error instanceof UserAuthorizationRequiredError) return NextResponse.json({ error: 'WhatsApp authorization required', authorize: true }, { status: 412 })
    return NextResponse.json({ error: 'WhatsApp authorization unavailable' }, { status: 502 })
  }

  const lines = (returns ?? []).map(formatReturn)
  const message = lines.length ? `Upcoming vehicle returns\n\n${lines.join('\n')}` : `No vehicle returns are scheduled in the next ${daysAhead} day${daysAhead === 1 ? '' : 's'}.`
  const response = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: process.env.WHATSAPP_RECIPIENT_PHONE, type: 'text', text: { body: message } }),
  })
  if (!response.ok) return NextResponse.json({ error: 'WhatsApp message failed' }, { status: 502 })
  return NextResponse.json({ sent: true, count: lines.length })
}

export async function GET(request: Request) {
  const cronSecret = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || cronSecret !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return POST(request)
}

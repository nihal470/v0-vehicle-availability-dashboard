'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, Check, Copy, Download, Mail, MessageCircle, Printer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { VehicleBooking, Vehicle } from '@/lib/types'

export interface BookingConfirmationData extends VehicleBooking {
  vehicle: Vehicle & { category?: { name: string } | null }
  booking_number?: string | null
  ag_no?: string | null
  customer_email?: string | null
  return_time?: string | null
  total_amount?: number | null
  rental_amount?: number | null
  deposit_amount?: number | null
  amount_paid?: number | null
}

const omr = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'OMR', minimumFractionDigits: 3 })
const date = (value: string) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Asia/Muscat' }).format(new Date(`${value}T12:00:00`))

export function BookingConfirmation({ booking, publicView = false }: { booking: BookingConfirmationData; publicView?: boolean }) {
  const [copied, setCopied] = useState(false)
  const total = Number(booking.total_amount ?? booking.rental_amount ?? 0)
  const deposit = Number(booking.deposit_amount ?? 0)
  const reference = booking.booking_number ?? booking.ag_no ?? booking.id.slice(0, 8).toUpperCase()
  const summary = useMemo(() => `Booking confirmation ${reference}\n${booking.customer_name}\n${booking.vehicle.make} ${booking.vehicle.model} (${booking.vehicle.license_plate})\n${date(booking.start_date)} – ${date(booking.end_date)}\nTotal: ${omr.format(total)}`, [booking, reference, total])

  const copy = async () => { await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 1600) }
  const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(summary + `\n${window.location.href}`)}`, '_blank', 'noopener,noreferrer')
  const email = () => { window.location.href = `mailto:${booking.customer_email ?? ''}?subject=${encodeURIComponent(`Booking confirmation ${reference}`)}&body=${encodeURIComponent(summary + `\n\n${window.location.href}`)}` }

  return <div className="min-h-screen bg-muted/30 px-4 py-8 print:bg-background print:p-0">
    {!publicView && <div className="mx-auto mb-5 flex max-w-4xl flex-wrap justify-end gap-2 print:hidden"><Button variant="outline" onClick={copy}><Copy className="mr-2 size-4" />{copied ? 'Copied' : 'Copy link'}</Button><Button variant="outline" onClick={email}><Mail className="mr-2 size-4" />Email</Button><Button variant="outline" onClick={shareWhatsApp}><MessageCircle className="mr-2 size-4" />WhatsApp</Button><Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 size-4" />Download / Print</Button></div>}
    <article className="mx-auto max-w-4xl overflow-hidden border bg-background shadow-sm print:border-0 print:shadow-none">
      <header className="flex items-start justify-between gap-6 border-b-4 border-primary px-8 py-8 sm:px-12"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Travz Car Rental</p><h1 className="mt-3 text-3xl font-bold tracking-tight">Booking confirmation</h1><p className="mt-2 text-sm text-muted-foreground">Thank you for choosing Travz. Your reservation is confirmed.</p></div><div className="text-right"><Badge>CONFIRMED</Badge><p className="mt-3 font-mono text-sm">{reference}</p><p className="mt-1 text-xs text-muted-foreground">Issued {date(new Date().toISOString().slice(0, 10))}</p></div></header>
      <div className="space-y-8 px-8 py-8 sm:px-12"><section className="grid gap-6 border-b pb-8 md:grid-cols-2"><Info label="Customer" value={booking.customer_name || 'Not provided'} /><Info label="Contact" value={[booking.customer_phone, booking.customer_email].filter(Boolean).join(' · ') || 'Not provided'} /><Info label="Pickup" value={`${date(booking.start_date)}${booking.pickup_time ? ` · ${booking.pickup_time}` : ''}`} /><Info label="Return" value={`${date(booking.end_date)}${booking.return_time ? ` · ${booking.return_time}` : ''}`} /></section><section className="rounded-xl border bg-muted/20 p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Reserved vehicle</p><h2 className="mt-2 text-2xl font-bold">{booking.vehicle.make} {booking.vehicle.model}</h2><p className="mt-1 text-muted-foreground">{booking.vehicle.year ?? ''} · {booking.vehicle.color ?? 'Standard'} · {booking.vehicle.license_plate}</p></div><CalendarDays className="size-7 text-primary" /></div></section><section><h2 className="text-lg font-semibold">Reservation charges</h2><div className="mt-4 divide-y border-y"><Row label="Rental amount" value={omr.format(total)} /><Row label="Security deposit" value={omr.format(deposit)} /><Row label="Amount paid" value={omr.format(Number(booking.amount_paid ?? 0))} strong /><Row label="Balance due" value={omr.format(Math.max(total - Number(booking.amount_paid ?? 0), 0))} strong /></div></section><section className="grid gap-6 border-t pt-6 md:grid-cols-2"><div><h2 className="font-semibold">Included with your booking</h2><ul className="mt-3 space-y-2 text-sm text-muted-foreground"><li><Check className="mr-2 inline size-4 text-primary" />Vehicle handover inspection</li><li><Check className="mr-2 inline size-4 text-primary" />24/7 rental support</li><li><Check className="mr-2 inline size-4 text-primary" />Clear return instructions</li></ul></div><div><h2 className="font-semibold">Important information</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Please bring a valid driving licence and identification. The vehicle should be returned on time, with the same fuel level and condition recorded at pickup.</p></div></section></div><footer className="border-t bg-muted/20 px-8 py-6 text-center text-xs text-muted-foreground sm:px-12">This confirmation was generated by Travz Car Rental. Please keep it for your records.</footer>
    </article>
  </div>
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-2 font-medium">{value}</p></div> }
function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <div className={`flex justify-between gap-4 py-4 ${strong ? 'font-semibold' : ''}`}><span>{label}</span><span>{value}</span></div> }

export default BookingConfirmation

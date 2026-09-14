'use client'

import { useMemo, useState } from 'react'
import { Check, Copy, FileDown, Mail, MessageCircle, Pencil, Printer, Save, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { VehicleBooking, Vehicle } from '@/lib/types'

export interface BookingConfirmationData extends VehicleBooking {
  vehicle: Vehicle & { category?: { name: string } | null }
  booking_number?: string | null
  ag_no?: string | null
  customer_email?: string | null
  customer_country?: string | null
  payment_method?: string | null
  payment_status?: string | null
  payment_reference?: string | null
  return_time?: string | null
  total_amount?: number | null
  rental_amount?: number | null
  additional_charges?: number | null
  vat?: number | null
  discount?: number | null
  deposit_amount?: number | null
  amount_paid?: number | null
  airline?: string | null
  flight_number?: string | null
  flight_arrival_time?: string | null
  insurance_included?: boolean | null
  insurance_claim_fee?: number | null
  daily_mileage?: number | null
  excess_mileage_rate?: number | null
  included_services?: string[] | null
}

const money = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'OMR', minimumFractionDigits: 3 }).format(value)
const fmtDate = (value?: string | null) => value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'Asia/Muscat' }).format(new Date(`${value.slice(0, 10)}T12:00:00`)) : 'Not provided'
const daysBetween = (start: string, end: string) => Math.max(1, Math.ceil((new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86400000))

export default function BookingConfirmation({ booking, publicView = false }: { booking: BookingConfirmationData; publicView?: boolean }) {
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [draft, setDraft] = useState<Record<string, string>>({
    customer_name: booking.customer_name ?? '', customer_phone: booking.customer_phone ?? '',
    start_date: booking.start_date ?? '', end_date: booking.end_date ?? '',
    pickup_location: booking.pickup_location ?? '', dropoff_location: booking.dropoff_location ?? '',
    airline: booking.airline ?? '', flight_number: booking.flight_number ?? '',
    flight_arrival_time: booking.flight_arrival_time ?? '', flight_departure_time: booking.flight_departure_time ?? '',
    notes: booking.notes ?? '', status: booking.status ?? '',
    pickup_date: booking.pickup_date ?? '', pickup_time: booking.pickup_time ?? '', pickup_notes: booking.pickup_notes ?? '',
    dropoff_date: booking.dropoff_date ?? '', dropoff_time: booking.dropoff_time ?? '', dropoff_notes: booking.dropoff_notes ?? '',
  })
  const updateDraft = (field: string, value: string) => setDraft((current) => ({ ...current, [field]: value }))
  const saveBooking = async () => {
    setSaving(true); setEditError('')
    const { error } = await createClient().from('vehicle_bookings').update({ customer_name: draft.customer_name || null, customer_phone: draft.customer_phone || null, start_date: draft.start_date, end_date: draft.end_date, pickup_date: draft.pickup_date || null, pickup_time: draft.pickup_time || null, pickup_location: draft.pickup_location || null, pickup_notes: draft.pickup_notes || null, dropoff_date: draft.dropoff_date || null, dropoff_time: draft.dropoff_time || null, dropoff_location: draft.dropoff_location || null, dropoff_notes: draft.dropoff_notes || null, notes: draft.notes || null, airline: draft.airline || null, flight_number: draft.flight_number || null, flight_arrival_time: draft.flight_arrival_time || null, flight_departure_time: draft.flight_departure_time || null, status: draft.status }).eq('id', booking.id)
    if (error) setEditError(error.message); else window.location.reload()
    setSaving(false)
  }
  const reference = booking.booking_number ?? booking.ag_no ?? booking.id.slice(0, 8).toUpperCase()
  const days = daysBetween(booking.start_date, booking.end_date)
  const rental = Number(booking.rental_amount ?? booking.total_amount ?? 0)
  const additional = Number(booking.additional_charges ?? 0)
  const vat = Number(booking.vat ?? 0)
  const discount = Number(booking.discount ?? 0)
  const total = Number(booking.total_amount ?? rental + additional + vat - discount)
  const paid = Number(booking.amount_paid ?? 0)
  const includedMileage = Number(booking.daily_mileage ?? 0) * days
  const summary = useMemo(() => [`TRAVZ CAR RENTAL — BOOKING CONFIRMATION`, `Booking ID: ${reference}`, `Customer: ${booking.customer_name ?? 'Guest'}`, `Vehicle: ${booking.vehicle.make} ${booking.vehicle.model}`, `Pickup: ${fmtDate(booking.pickup_date ?? booking.start_date)} ${booking.pickup_time ?? ''} — ${booking.pickup_location ?? 'To be confirmed'}`, `Return: ${fmtDate(booking.dropoff_date ?? booking.end_date)} ${booking.dropoff_time ?? ''} — ${booking.dropoff_location ?? 'To be confirmed'}`, `Total: ${money(total)}`, `Payment: ${booking.payment_status ?? 'Pending'}`].join('\n'), [booking, reference, total])
  const copy = async () => { await navigator.clipboard.writeText(summary); setCopied(true); window.setTimeout(() => setCopied(false), 1600) }
  const whatsapp = () => window.open(`https://wa.me/${(booking.customer_phone ?? '').replace(/[^\d+]/g, '')}?text=${encodeURIComponent(summary)}`, '_blank', 'noopener,noreferrer')
  const email = () => { window.location.href = `mailto:${booking.customer_email ?? ''}?subject=${encodeURIComponent(`TravZ booking confirmation ${reference}`)}&body=${encodeURIComponent(summary)}` }

  return <div className="min-h-screen bg-muted/30 px-4 py-8 print:bg-background print:p-0"><style>{`@page { size: A4; margin: 12mm; } @media print { body { background: white; } article { max-width: none; box-shadow: none; border: 0; } section { break-inside: avoid; } }`}</style>
    {!publicView && editing && <div className="mx-auto mb-5 max-w-5xl rounded-xl border bg-background p-5 print:hidden"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Edit booking</h2><p className="text-sm text-muted-foreground">Update every customer, schedule, flight, payment, and pricing field.</p></div><Button variant="ghost" size="icon" onClick={() => setEditing(false)}><X className="size-4" /></Button></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[['customer_name','Customer name','text'],['customer_phone','Customer phone','text'],['start_date','Start date','date'],['end_date','End date','date'],['pickup_date','Pickup date','date'],['pickup_time','Pickup time','time'],['pickup_location','Pickup location','text'],['pickup_notes','Pickup notes','text'],['dropoff_date','Drop-off date','date'],['dropoff_time','Drop-off time','time'],['dropoff_location','Drop-off location','text'],['dropoff_notes','Drop-off notes','text'],['airline','Airline','text'],['flight_number','Flight number','text'],['flight_arrival_time','Arrival time','time'],['flight_departure_time','Departure time','time'],['status','Status','text']].map(([field,label,type]) => <label key={field} className="grid gap-1 text-sm font-medium">{label}<Input type={type} value={draft[field]} onChange={(event) => updateDraft(field, event.target.value)} /></label>)}<label className="grid gap-1 text-sm font-medium sm:col-span-2 lg:col-span-3">Notes<Textarea value={draft.notes} onChange={(event) => updateDraft('notes', event.target.value)} rows={3} /></label></div>{editError && <p className="mt-3 text-sm text-destructive">{editError}</p>}<div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button><Button onClick={saveBooking} disabled={saving}><Save className="mr-2 size-4" />{saving ? 'Saving…' : 'Save changes'}</Button></div></div>}
    {!publicView && <div className="mx-auto mb-5 flex max-w-5xl flex-wrap justify-end gap-2 print:hidden"><Button variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-2 size-4" />Edit booking</Button><Button variant="outline" onClick={copy}><Copy className="mr-2 size-4" />{copied ? 'Copied' : 'Copy confirmation'}</Button><Button variant="outline" onClick={email}><Mail className="mr-2 size-4" />Email</Button><Button variant="outline" onClick={whatsapp}><MessageCircle className="mr-2 size-4" />WhatsApp</Button><Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 size-4" />Print</Button><Button onClick={() => window.print()}><FileDown className="mr-2 size-4" />Download PDF</Button></div>}
    <article className="mx-auto max-w-5xl overflow-hidden border bg-background shadow-sm print:border-0 print:shadow-none">
      <header className="flex flex-col gap-6 border-b-4 border-primary px-7 py-8 sm:flex-row sm:items-start sm:justify-between sm:px-12"><div><p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">TravZ Car Rental</p><h1 className="mt-3 text-3xl font-bold uppercase tracking-tight">Booking confirmation</h1><p className="mt-2 max-w-xl text-sm text-muted-foreground">Dear {booking.customer_name ?? 'Customer'}, thank you for choosing TravZ Car Rental. Your reservation details are confirmed below.</p></div><div className="sm:text-right"><Badge>BOOKING {String(booking.status).toUpperCase()}</Badge><p className="mt-3 font-mono text-sm">{reference}</p><p className="mt-1 text-xs text-muted-foreground">Created {fmtDate(booking.created_at)}</p></div></header>
      <div className="space-y-8 px-7 py-8 sm:px-12"><Section title="Customer details"><Grid items={[["Name", booking.customer_name ?? 'Not provided'], ['Email', booking.customer_email ?? 'Not provided'], ['Phone', booking.customer_phone ?? 'Not provided'], ['Country', booking.customer_country ?? 'Not provided']]} /></Section>
      <Section title="Booking details"><Grid items={[["Booking ID", reference], ['Status', String(booking.status)], ['Payment method', booking.payment_method ?? 'Not provided'], ['Payment status', booking.payment_status ?? 'Pending'], ['Created', fmtDate(booking.created_at)], ['Payment reference', booking.payment_reference ?? 'Not provided']]} /></Section>
      <Section title="Rental details"><Grid items={[["Pickup", `${fmtDate(booking.pickup_date ?? booking.start_date)}${booking.pickup_time ? `, ${booking.pickup_time}` : ''}`], ['Pickup location', booking.pickup_location ?? 'To be confirmed'], ['Drop-off', `${fmtDate(booking.dropoff_date ?? booking.end_date)}${booking.dropoff_time ? `, ${booking.dropoff_time}` : ''}`], ['Drop-off location', booking.dropoff_location ?? 'To be confirmed'], ['Rental period', `${days} day${days === 1 ? '' : 's'}`]]} /></Section>
      <Section title="Flight details"><Grid items={[["Airline", booking.airline ?? 'Not provided'], ['Flight number', booking.flight_number ?? 'Not provided'], ['Arrival time', booking.flight_arrival_time ?? 'Not provided'], ['Departure time', booking.flight_departure_time ?? 'Not provided']]} /></Section>
      <Section title="Vehicle information"><div className="rounded-xl border bg-muted/20 p-5"><h3 className="text-xl font-bold">{booking.vehicle.make} {booking.vehicle.model} <span className="text-muted-foreground">or similar</span></h3><Grid items={[["Category", booking.vehicle.category?.name ?? 'Not provided'], ['Registration', booking.vehicle.license_plate ?? 'Assigned at handover'], ['Year / colour', `${booking.vehicle.year ?? '—'} / ${booking.vehicle.color ?? '—'}`]]} /></div></Section>
      <Section title="Insurance and mileage"><Grid items={[["Comprehensive insurance", booking.insurance_included ? 'Included' : 'Not included'], ['Claim fee', money(Number(booking.insurance_claim_fee ?? 0))], ['Mileage included per day', `${Number(booking.daily_mileage ?? 0)} km`], ['Total mileage included', `${includedMileage.toLocaleString()} km for ${days} days`], ['Excess mileage rate', money(Number(booking.excess_mileage_rate ?? 0)) + ' per km']]} /></Section>
      <Section title="Price breakdown"><div className="divide-y border-y"><Row label="Base rental amount" value={money(rental)} /><Row label="Additional services" value={money(additional)} /><Row label="VAT" value={money(vat)} /><Row label="Discount" value={`-${money(discount)}`} /><Row label="Total rental amount" value={money(total)} strong /></div><div className="mt-5 flex flex-col gap-3 rounded-xl bg-primary p-5 text-primary-foreground sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest opacity-80">{paid >= total && total > 0 ? 'Total paid' : 'Total rental amount'}</p><p className="mt-1 text-sm opacity-80">{booking.payment_status ?? 'Payment pending'}</p></div><p className="text-3xl font-bold">{money(total)}</p></div></Section>
      <Section title="Included services"><div className="grid gap-2 sm:grid-cols-2">{(booking.included_services?.length ? booking.included_services : ['Vehicle handover inspection', '24/7 rental support', 'Clear return instructions', 'VAT where applicable']).map((service) => <p key={service} className="text-sm"><Check className="mr-2 inline size-4 text-primary" />{service}</p>)}</div></Section>
      <Section title="Documents required"><div className="grid gap-2 sm:grid-cols-3">{['Valid passport', 'Valid driving licence', 'Valid visa / entry document, if applicable'].map((document) => <p key={document} className="text-sm"><Check className="mr-2 inline size-4 text-primary" />{document}</p>)}</div></Section>
      <footer className="border-t pt-7 text-sm text-muted-foreground"><p className="font-medium text-foreground">Thank you for choosing TravZ Car Rental. We look forward to welcoming you to Oman and wish you a pleasant journey.</p><p className="mt-4">Best regards,<br />TravZ Car Rental<br />+968 95361234</p></footer></div>
    </article>
  </div>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="break-inside-avoid"><h2 className="mb-4 border-b pb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">{title}</h2>{children}</section> }
function Grid({ items }: { items: [string, string][] }) { return <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">{items.map(([label, value]) => <div key={label}><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div>)}</div> }
function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <div className={`flex justify-between gap-4 py-4 ${strong ? 'text-base font-bold' : 'text-sm'}`}><span>{label}</span><span>{value}</span></div> }

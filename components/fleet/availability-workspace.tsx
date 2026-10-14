'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { CalendarDays, LayoutDashboard, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Vehicle = { id: string; make: string; model: string; license_plate: string | null; status: string; category_id: string | null; customer_name: string | null; start_date: string | null; return_date: string | null; return_time: string | null; ag_no: string | null; total_rent: number | null; category: { id: string; name: string } | null }
type Booking = { id: string; vehicle_id: string; customer_name: string | null; status: string; pickup_at: string | null; return_at: string | null; start_date: string; end_date: string }

type CellStatus = 'A' | 'OT' | 'R' | 'B'
const activeStatuses = new Set(['booked', 'reserved', 'confirmed', 'active', 'running'])
const blockedStatuses = new Set(['garage', 'maintenance', 'in_service', 'service', 'inactive'])
const statusStyles: Record<CellStatus, string> = { A: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100', OT: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200 hover:bg-sky-100', R: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200 hover:bg-violet-100', B: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-100' }
const dateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const displayDate = (date: Date) => new Intl.DateTimeFormat('en', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' }).format(date)

export function AvailabilityWorkspace({ vehicles, categories, bookings }: { vehicles: Vehicle[]; categories: { id: string; name: string }[]; bookings: Booking[] }) {
  const today = new Date()
  const [vehiclesState, setVehiclesState] = useState(vehicles)
  const [bookingsState, setBookingsState] = useState(bookings)
  const [from, setFrom] = useState(dateKey(today))
  const [to, setTo] = useState(dateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6)))
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [country, setCountry] = useState('all')

  useEffect(() => {
    const supabase = createClient()
    const refreshVehicles = async () => {
      const { data } = await supabase.from('vehicles').select('id, make, model, license_plate, status, category_id, customer_name, start_date, return_date, return_time, ag_no, total_rent, category:vehicle_categories(id, name)').order('make')
      if (data) setVehiclesState(data as unknown as typeof vehicles)
    }
    const refreshBookings = async () => {
      const { data } = await supabase.from('vehicle_bookings').select('id, vehicle_id, customer_name, status, pickup_at, return_at, start_date, end_date').not('status', 'eq', 'cancelled')
      if (data) setBookingsState(data as typeof bookings)
    }
    const channel = supabase.channel('fleet-availability-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, refreshVehicles)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_bookings' }, refreshBookings)
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [])

  const days = useMemo(() => {
    const start = new Date(`${from}T12:00:00`)
    const end = new Date(`${to}T12:00:00`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return []
    const output: Date[] = []
    for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) output.push(new Date(cursor))
    return output
  }, [from, to])
  const firstDay = days[0] ?? new Date(`${from}T12:00:00`)
  const filteredVehicles = useMemo(() => vehiclesState.filter((vehicle) => (category === 'all' || vehicle.category_id === category) && `${vehicle.make} ${vehicle.model} ${vehicle.license_plate ?? ''}`.toLowerCase().includes(search.toLowerCase()) && (country === 'all' || vehicle.category?.name === country)), [vehiclesState, category, search, country])
  const getCell = (vehicle: Vehicle, day: Date): CellStatus => { if (blockedStatuses.has(vehicle.status)) return 'B'; const dayStart = new Date(`${dateKey(day)}T00:00:00Z`); const dayEnd = new Date(`${dateKey(day)}T23:59:59Z`); const booking = bookingsState.find((item) => item.vehicle_id === vehicle.id && activeStatuses.has(item.status) && new Date(item.pickup_at ?? `${item.start_date}T00:00:00Z`) < dayEnd && new Date(item.return_at ?? `${item.end_date}T23:59:59Z`) > dayStart)
    if (booking) return booking.status === 'reserved' ? 'R' : 'OT'
    if (vehicle.status === 'running' && vehicle.return_date && vehicle.return_date >= dateKey(day)) return 'OT'
    if (vehicle.status === 'reserved') return 'R'
    return 'A' }
  const counts = useMemo(() => filteredVehicles.reduce((result, vehicle) => { result[getCell(vehicle, firstDay)] += 1; return result }, { A: 0, OT: 0, R: 0, B: 0 } as Record<CellStatus, number>), [filteredVehicles, firstDay, bookingsState])
  const bookingHref = (vehicle: Vehicle) => `/bookings?vehicle_id=${encodeURIComponent(vehicle.id)}&start_date=${from}&end_date=${to}`

  return <main className="min-h-screen bg-gradient-to-b from-muted/50 to-background"><header className="border-b bg-background/90 backdrop-blur"><div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-5"><div className="flex items-center gap-4"><div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm"><CalendarDays className="size-5" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Fleet operations</p><h1 className="text-2xl font-bold tracking-tight">Vehicle availability</h1><p className="text-sm text-muted-foreground">Plan every vehicle across your selected dates.</p></div></div><Button asChild variant="secondary"><Link href="/"><LayoutDashboard className="mr-2 size-4" />Dashboard</Link></Button></div></header><div className="mx-auto max-w-[1600px] space-y-6 p-6"><section className="grid gap-4 rounded-2xl border bg-background p-5 shadow-sm md:grid-cols-6"><div className="md:col-span-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold">Daily planning view</h2><p className="text-sm text-muted-foreground">Choose a date range and filter your fleet.</p></div><div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-emerald-100 px-3 py-1.5 font-medium text-emerald-700">{counts.A} available</span><span className="rounded-full bg-sky-100 px-3 py-1.5 font-medium text-sky-700">{counts.OT} on trip</span><span className="rounded-full bg-violet-100 px-3 py-1.5 font-medium text-violet-700">{counts.R} reserved</span><span className="rounded-full bg-rose-100 px-3 py-1.5 font-medium text-rose-700">{counts.B} blocked</span></div></div><label className="grid gap-1 text-sm font-medium">From<Input type="date" value={from} onChange={(e) => { const nextFrom = e.target.value; setFrom(nextFrom); if (to < nextFrom) setTo(nextFrom) }} /></label><label className="grid gap-1 text-sm font-medium">To<Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value < from ? from : e.target.value)} /></label><label className="grid gap-1 text-sm font-medium">Model / plate<div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search vehicle" value={search} onChange={(e) => setSearch(e.target.value)} /></div></label><label className="grid gap-1 text-sm font-medium">Category<select className="h-10 rounded-md border bg-background px-3" value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="grid gap-1 text-sm font-medium">Country<select className="h-10 rounded-md border bg-background px-3" value={country} onChange={(e) => setCountry(e.target.value)}><option value="all">All</option>{categories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label><div className="flex items-end"><Button className="w-full" onClick={() => { setFrom(dateKey(new Date())); setTo(dateKey(new Date(new Date().setDate(new Date().getDate() + 6)))) }}>Today</Button></div></section><section className="flex flex-wrap items-center gap-2 rounded-xl border bg-background p-4 text-sm"><span className="font-semibold">Legend:</span>{(['A', 'OT', 'R', 'B'] as CellStatus[]).map((status) => <span key={status} className={`rounded-md px-3 py-1 font-bold ${statusStyles[status]}`}>{status} <span className="font-normal">{status === 'A' ? 'Available' : status === 'OT' ? 'On trip' : status === 'R' ? 'Reserved' : 'Blocked'}</span></span>)}<span className="ml-auto text-muted-foreground">{filteredVehicles.length} vehicles · {counts.A} available on first day</span></section><section className="overflow-hidden rounded-xl border bg-background shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-sm"><thead><tr className="border-b bg-muted/50"><th className="sticky left-0 z-10 w-64 border-r bg-muted/50 px-4 py-3 text-left">Vehicle</th>{days.map((day) => <th key={dateKey(day)} className="min-w-24 border-r px-3 py-3 text-center font-semibold">{displayDate(day)}</th>)}</tr></thead><tbody>{filteredVehicles.map((vehicle) => <tr key={vehicle.id} className="border-b last:border-0"><th className="sticky left-0 z-10 border-r bg-background px-4 py-3 text-left"><div className="font-semibold">{vehicle.make} {vehicle.model}</div><div className="text-xs font-normal text-muted-foreground">{vehicle.license_plate ?? 'No plate'} · {vehicle.category?.name ?? 'Uncategorized'}</div></th>{days.map((day) => { const status = getCell(vehicle, day); return <td key={dateKey(day)} className="border-r p-1"><Button asChild variant="ghost" className={`h-12 w-full rounded-md text-lg font-bold ${statusStyles[status]}`}><Link href={status === 'A' ? bookingHref(vehicle) : `/gantt?vehicle_id=${vehicle.id}&date=${dateKey(day)}`} title={status === 'A' ? 'Start booking for this vehicle and date range' : 'View schedule'}>{status}</Link></Button></td> })}</tr>)}</tbody></table></div></section></div></main>
}

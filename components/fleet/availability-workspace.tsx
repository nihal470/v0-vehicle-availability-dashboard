'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Car, Clock3, LayoutDashboard, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type Vehicle = { id: string; make: string; model: string; license_plate: string | null; status: string; category_id: string | null; category: { id: string; name: string } | null }
type Booking = { id: string; vehicle_id: string; customer_name: string | null; status: string; pickup_at: string | null; return_at: string | null; start_date: string; end_date: string }

const activeStatuses = new Set(['booked', 'reserved', 'confirmed', 'active', 'running'])
const formatTime = (value: string | null) => value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Time not provided'

export function AvailabilityWorkspace({ vehicles, categories, bookings }: { vehicles: Vehicle[]; categories: { id: string; name: string }[]; bookings: Booking[] }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [pickup, setPickup] = useState('09:00')
  const [returnTime, setReturnTime] = useState('18:00')
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')

  const range = useMemo(() => ({ start: new Date(`${date}T${pickup}:00Z`), end: new Date(`${date}T${returnTime}:00Z`) }), [date, pickup, returnTime])
  const rows = useMemo(() => vehicles.filter((vehicle) => {
    const matchesCategory = category === 'all' || vehicle.category_id === category
    const matchesSearch = `${vehicle.make} ${vehicle.model} ${vehicle.license_plate ?? ''}`.toLowerCase().includes(search.toLowerCase())
    const blocked = ['garage', 'maintenance', 'in_service', 'service', 'inactive'].includes(vehicle.status)
    const booking = bookings.find((item) => item.vehicle_id === vehicle.id && activeStatuses.has(item.status) && item.pickup_at && item.return_at && new Date(item.pickup_at) < range.end && new Date(item.return_at) > range.start)
    return matchesCategory && matchesSearch && !blocked && !booking
  }), [vehicles, bookings, category, search, range])
  const bookedCount = vehicles.filter((vehicle) => bookings.some((item) => item.vehicle_id === vehicle.id && activeStatuses.has(item.status) && item.pickup_at && item.return_at && new Date(item.pickup_at) < range.end && new Date(item.return_at) > range.start)).length
  const unavailableCount = vehicles.filter((vehicle) => ['garage', 'maintenance', 'in_service', 'service', 'inactive'].includes(vehicle.status)).length

  return <main className="min-h-screen bg-muted/30"><header className="border-b bg-sidebar text-sidebar-foreground"><div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4"><div className="flex items-center gap-3"><CalendarDays className="size-7" /><div><h1 className="text-xl font-bold">Vehicle availability</h1><p className="text-sm text-sidebar-foreground/70">Find the right car for an exact pickup and return window.</p></div></div><Button asChild variant="secondary"><Link href="/"><LayoutDashboard className="mr-2 size-4" />Dashboard</Link></Button></div></header><div className="mx-auto max-w-[1600px] space-y-6 p-6"><section className="grid gap-3 rounded-xl border bg-background p-4 md:grid-cols-5"><label className="grid gap-1 text-sm font-medium">Pickup date<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><label className="grid gap-1 text-sm font-medium">Pickup time<Input type="time" value={pickup} onChange={(e) => setPickup(e.target.value)} /></label><label className="grid gap-1 text-sm font-medium">Return time<Input type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} /></label><label className="grid gap-1 text-sm font-medium">Category<select className="h-10 rounded-md border bg-background px-3" value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="grid gap-1 text-sm font-medium">Search<div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" placeholder="Make, model or plate" value={search} onChange={(e) => setSearch(e.target.value)} /></div></label></section><section className="grid gap-4 sm:grid-cols-3"><div className="rounded-xl border bg-background p-4"><p className="text-sm text-muted-foreground">Available now</p><p className="mt-1 text-3xl font-bold text-emerald-600">{rows.length}</p></div><div className="rounded-xl border bg-background p-4"><p className="text-sm text-muted-foreground">Booked in window</p><p className="mt-1 text-3xl font-bold text-violet-600">{bookedCount}</p></div><div className="rounded-xl border bg-background p-4"><p className="text-sm text-muted-foreground">Maintenance / unavailable</p><p className="mt-1 text-3xl font-bold text-orange-600">{unavailableCount}</p></div></section><section className="rounded-xl border bg-background"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><h2 className="font-semibold">Available vehicles</h2><p className="text-sm text-muted-foreground">{date} from {pickup} to {returnTime}</p></div><Clock3 className="size-5 text-primary" /></div><div className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3">{rows.map((vehicle) => <article key={vehicle.id} className="flex items-center justify-between rounded-lg border p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-emerald-100 p-2 text-emerald-700"><Car className="size-5" /></div><div><h3 className="font-semibold">{vehicle.make} {vehicle.model}</h3><p className="text-sm text-muted-foreground">{vehicle.license_plate ?? 'No plate'} · {vehicle.category?.name ?? 'Uncategorized'}</p></div></div><Badge className="bg-emerald-600">Available</Badge></article>)}{rows.length === 0 && <div className="col-span-full py-12 text-center text-muted-foreground">No vehicle is available for this exact time window.</div>}</div></section></div></main>
}

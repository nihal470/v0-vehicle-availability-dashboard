'use client'

import { ReturnsSummary } from './returns-summary'
import { ActiveAlerts } from '@/components/vehicles/active-alerts'
import { DocumentExpiry } from './document-expiry'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, ChevronRight, Info, Receipt, ClipboardCheck } from 'lucide-react'
import Link from 'next/link'
import type { CategoryWithVehicles, Location, VehicleCategory, Vehicle, VehicleBooking } from '@/lib/types'

interface DashboardProps {
  initialCategories: CategoryWithVehicles[]
  locations: Location[]
  allCategories: VehicleCategory[]
  vehicles: Vehicle[]
  todayBookingsCount: number
  bookings: VehicleBooking[]
}

function QuickAction({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return <Link href={href} className="block"><Button variant="outline" className="w-full justify-start gap-2 group hover:border-primary hover:bg-primary/5">{icon}{label}</Button></Link>
}

export function Dashboard({ 
  initialCategories, 
  locations, 
  allCategories,
  vehicles,
  todayBookingsCount,
  bookings,
}: DashboardProps) {
  const dueToday = vehicles.filter((vehicle) => vehicle.return_date === new Date().toISOString().slice(0, 10))
  const maintenanceVehicles = vehicles.filter((vehicle) => ['maintenance', 'garage'].includes(vehicle.status))

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 lg:grid-cols-2">
      <section aria-label="Upcoming returns"><ReturnsSummary /></section>
      <section aria-label="Upcoming bookings"><Card className="overflow-hidden border-primary/15 bg-background/90 shadow-sm"><div className="h-1 bg-gradient-to-r from-primary via-cyan-500 to-emerald-500" /><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base font-semibold tracking-tight">Upcoming bookings</CardTitle><p className="text-xs text-muted-foreground">Next scheduled pickups</p></div><Link href="/bookings" className="text-xs font-semibold text-primary hover:underline">View all</Link></div></CardHeader><CardContent className="flex flex-col gap-2">{bookings.filter((booking) => ['booked', 'reserved'].includes(booking.status)).slice(0, 7).map((booking) => <div key={booking.id} className="rounded-lg border bg-muted/20 px-3 py-2"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-medium">{booking.customer_name || 'Customer not selected'}</p><span className="shrink-0 text-xs font-medium text-primary">{booking.start_date}</span></div><p className="mt-1 text-xs text-muted-foreground">{booking.vehicle_id ? 'Vehicle assigned' : 'Vehicle pending'} · {booking.pickup_time || 'Time not set'}</p></div>)}{!bookings.filter((booking) => ['booked', 'reserved'].includes(booking.status)).length && <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">No upcoming bookings</div>}</CardContent></Card></section>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Fleet allocation overview">
        {[
          { label: 'Total fleet', value: vehicles.length, detail: 'Vehicles in system', tone: 'bg-slate-950 text-white' },
          { label: 'Available now', value: vehicles.filter((vehicle) => vehicle.status === 'available' || vehicle.status === 'idle').length, detail: 'Ready for allocation', tone: 'bg-emerald-50 text-emerald-950' },
          { label: 'Return due today', value: dueToday.length, detail: 'Needs follow-up', tone: 'bg-amber-50 text-amber-950' },
          { label: 'Maintenance', value: maintenanceVehicles.length, detail: 'Not available to rent', tone: 'bg-rose-50 text-rose-950' },
        ].map((metric) => <Card key={metric.label} className={`overflow-hidden border-0 shadow-sm ${metric.tone}`}><CardContent className="p-5"><p className="text-sm font-medium opacity-75">{metric.label}</p><p className="mt-2 text-3xl font-bold tracking-tight">{metric.value}</p><p className="mt-1 text-xs opacity-70">{metric.detail}</p></CardContent></Card>)}
      </section>
      <div className="max-w-xl">
        <Card className="overflow-hidden border-primary/15 bg-background/90 shadow-sm"><div className="h-1 bg-gradient-to-r from-primary via-cyan-500 to-emerald-500" />
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <Info className="h-4 w-4 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/vehicle-logs" className="block">
              <Button variant="outline" className="w-full justify-between group hover:border-primary hover:bg-primary/5">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Trip Logs & Fines
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Button>
            </Link>
            <Link href="/payments" className="block">
              <Button variant="outline" className="w-full justify-between group hover:border-primary hover:bg-primary/5">
                <span className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  Payments & Receipts
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Button>
            </Link>
            <div className="grid gap-2 sm:grid-cols-2">
                          <Link href="/bookings?date=today" className="block sm:col-span-2">
                <Button variant="outline" className="w-full justify-between group border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/10">
                  <span className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary" />Today&apos;s Bookings</span>
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">{todayBookingsCount}</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Insurance, Mulkiya & Service Monitoring */}
      <ActiveAlerts vehicles={vehicles} />

      {/* Document Expiry Section */}
      <DocumentExpiry />
    </div>
  )
}

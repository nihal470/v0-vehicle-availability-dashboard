import { createClient } from '@/lib/supabase/server'
import { Dashboard } from '@/components/fleet/dashboard'
import type { CategoryWithVehicles, FleetStats, Location, VehicleCategory, Vehicle, VehicleBooking } from '@/lib/types'
import { Truck, Gauge, FileText, Car, Activity, GanttChartSquare, Building2, Wrench } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { HeaderAuthMenu } from '@/components/auth/header-auth-menu'

// Disable caching for real-time data
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getFleetData() {
  const supabase = await createClient()

  // Fetch all data in parallel
  const [
    { data: categories },
    { data: vehicles },
    { data: bookings },
    { data: todayBookings },
    { data: locations },
  ] = await Promise.all([
    supabase.from('vehicle_categories').select('*').order('name'),
    supabase.from('vehicles').select('*').order('make, model'),
    supabase.from('vehicle_bookings').select('*').eq('status', 'booked'),
    supabase.from('vehicle_bookings').select('id').eq('status', 'booked').eq('start_date', format(new Date(), 'yyyy-MM-dd')),
    supabase.from('locations').select('*').order('name'),
  ])

  // Build categories with vehicles and their bookings (exclude returned vehicles from active operations)
  const categoriesWithVehicles: CategoryWithVehicles[] = (categories || []).map((category: VehicleCategory) => {
    const categoryVehicles = (vehicles || [])
      .filter((v: Vehicle) => v.category_id === category.id && v.status !== 'returned')
      .map((vehicle: Vehicle) => ({
        ...vehicle,
        bookings: (bookings || []).filter((b: VehicleBooking) => b.vehicle_id === vehicle.id),
      }))
    
    return {
      ...category,
      vehicles: categoryVehicles,
    }
  })

  // Calculate stats (exclude returned/inactive vehicles from active fleet)
  const allVehicles = vehicles || []
  const activeVehicles = allVehicles.filter((v: Vehicle) => v.status !== 'returned')
  const stats: FleetStats = {
    totalVehicles: activeVehicles.length,
    runningVehicles: activeVehicles.filter((v: Vehicle) => v.status === 'running').length,
    idleVehicles: activeVehicles.filter((v: Vehicle) => v.status === 'idle').length,
    inGarage: activeVehicles.filter((v: Vehicle) => v.status === 'garage').length,
    available: activeVehicles.filter((v: Vehicle) => v.status === 'available').length,
    maintenance: activeVehicles.filter((v: Vehicle) => v.status === 'maintenance').length,
  }

  return {
    categories: categoriesWithVehicles,
    locations: locations || [],
    allCategories: categories || [],
    vehicles: allVehicles,
    bookings: bookings || [],
    stats,
    todayBookingsCount: todayBookings?.length ?? 0,
  }
}

async function getCurrentUserEmail() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.email ?? null
}

export default async function FleetPage() {
  const [{ categories, locations, allCategories, vehicles, bookings, stats, todayBookingsCount }, userEmail] = await Promise.all([
    getFleetData(),
    getCurrentUserEmail(),
  ])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/.12),transparent_32%),linear-gradient(180deg,hsl(var(--muted)/.45),hsl(var(--background)))]">
      {/* Professional Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/95 text-white shadow-xl backdrop-blur">
        <div className="mx-auto max-w-[1800px]">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md">
                <Truck className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Fleet Management System</h1>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Activity className="h-3 w-3" />
                  <span>Real-time Vehicle Availability</span>
                  <span className="text-slate-600">|</span>
                  <span>{format(new Date(), 'EEEE, MMMM d, yyyy')}</span>
                </div>
              </div>
            </div>
            
            {/* Quick Stats in Header */}
            <div className="hidden lg:flex items-center gap-6">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50">
                <Car className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-400">Total:</span>
                <span className="font-semibold">{stats.totalVehicles}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm">Running:</span>
                <span className="font-semibold">{stats.runningVehicles}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <span className="text-sm">Idle:</span>
                <span className="font-semibold">{stats.idleVehicles}</span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-2">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <Link href="/vehicles">
                  <Gauge className="mr-2 h-4 w-4" />
                  Tracking
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <Link href="/gantt">
                  <GanttChartSquare className="mr-2 h-4 w-4" />
                  Gantt
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <Link href="/branches">
                  <Building2 className="mr-2 h-4 w-4" />
                  Branches
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <Link href="/vehicle-logs">
                  <FileText className="mr-2 h-4 w-4" />
                  Logs
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <Link href="/vehicle-service">
                  <Wrench className="mr-2 h-4 w-4" />
                  Service
                </Link>
              </Button>
              <div className="ml-2 border-l border-slate-700 pl-2">
                <HeaderAuthMenu userEmail={userEmail} />
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 lg:py-8">
        <section className="mb-8 flex flex-col justify-between gap-5 rounded-3xl border border-primary/15 bg-background/80 p-6 shadow-sm backdrop-blur sm:flex-row sm:items-end sm:p-8">
          <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">Operations center</p><h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Good to see you, fleet team.</h2><p className="mt-2 max-w-xl text-muted-foreground">Monitor today&apos;s vehicles, bookings, returns, and service alerts from one focused workspace.</p></div>
          <div className="flex items-center gap-2 rounded-full border bg-muted/40 px-4 py-2 text-sm text-muted-foreground"><span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_hsl(var(--success)/.15)]" /> Live fleet data</div>
        </section>
    <Dashboard
      initialCategories={categories}
      locations={locations}
      allCategories={allCategories}
  vehicles={vehicles}
  bookings={bookings || []}
  todayBookingsCount={todayBookingsCount}
    />
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-4 mt-8">
        <div className="mx-auto max-w-[1800px] px-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Fleet Management System v1.0</span>
            <span>Last updated: {format(new Date(), 'HH:mm')}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

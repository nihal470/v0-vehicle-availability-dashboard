import { createClient } from '@/lib/supabase/server'
import { Dashboard } from '@/components/fleet/dashboard'
import type { CategoryWithVehicles, FleetStats, Location, VehicleCategory, Vehicle, VehicleBooking } from '@/lib/types'
import { Truck, Calendar, Gauge, FileText, Car, Activity } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

async function getFleetData() {
  const supabase = await createClient()

  // Fetch all data in parallel
  const [
    { data: categories },
    { data: vehicles },
    { data: bookings },
    { data: locations },
  ] = await Promise.all([
    supabase.from('vehicle_categories').select('*').order('name'),
    supabase.from('vehicles').select('*').order('make, model'),
    supabase.from('vehicle_bookings').select('*').eq('status', 'booked'),
    supabase.from('locations').select('*').order('name'),
  ])

  // Build categories with vehicles and their bookings
  const categoriesWithVehicles: CategoryWithVehicles[] = (categories || []).map((category: VehicleCategory) => {
    const categoryVehicles = (vehicles || [])
      .filter((v: Vehicle) => v.category_id === category.id)
      .map((vehicle: Vehicle) => ({
        ...vehicle,
        bookings: (bookings || []).filter((b: VehicleBooking) => b.vehicle_id === vehicle.id),
      }))
    
    return {
      ...category,
      vehicles: categoryVehicles,
    }
  })

  // Calculate stats
  const allVehicles = vehicles || []
  const stats: FleetStats = {
    totalVehicles: allVehicles.length,
    runningVehicles: allVehicles.filter((v: Vehicle) => v.status === 'running').length,
    idleVehicles: allVehicles.filter((v: Vehicle) => v.status === 'idle').length,
    inGarage: allVehicles.filter((v: Vehicle) => v.status === 'garage').length,
    available: allVehicles.filter((v: Vehicle) => v.status === 'available').length,
    maintenance: allVehicles.filter((v: Vehicle) => v.status === 'maintenance').length,
  }

  return {
    categories: categoriesWithVehicles,
    locations: locations || [],
    allCategories: categories || [],
    stats,
  }
}

export default async function FleetPage() {
  const { categories, locations, allCategories, stats } = await getFleetData()

  return (
    <div className="min-h-screen bg-background">
      {/* Professional Header */}
      <header className="sticky top-0 z-50 border-b bg-slate-900 text-white shadow-lg">
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
                <Link href="/calendar">
                  <Calendar className="mr-2 h-4 w-4" />
                  Calendar
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
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1800px] p-6">
        <Dashboard
          initialCategories={categories}
          locations={locations}
          allCategories={allCategories}
          stats={stats}
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

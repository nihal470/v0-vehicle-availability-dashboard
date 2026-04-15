import { createClient } from '@/lib/supabase/server'
import { Dashboard } from '@/components/fleet/dashboard'
import type { CategoryWithVehicles, FleetStats, Location, VehicleCategory, Vehicle, VehicleBooking } from '@/lib/types'
import { Truck } from 'lucide-react'

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
    inGarage: allVehicles.filter((v: Vehicle) => v.status === 'garage' || v.status === 'maintenance').length,
    available: allVehicles.filter((v: Vehicle) => v.status === 'available').length,
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
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-6 py-4">
          <Truck className="h-8 w-8" />
          <div>
            <h1 className="text-xl font-bold">Fleet Management</h1>
            <p className="text-sm text-sidebar-foreground/70">Vehicle Availability Dashboard</p>
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
    </div>
  )
}

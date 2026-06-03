import { createClient } from '@/lib/supabase/server'
import { BookingCalendar } from '@/components/fleet/booking-calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import type { CategoryWithVehicles, VehicleWithBookings, VehicleBooking } from '@/lib/types'

// Disable caching for real-time data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Booking Calendar - Fleet Management',
  description: 'View and manage vehicle bookings',
}

export default async function CalendarPage() {
  const supabase = await createClient()
  
  // Fetch categories with vehicles and their bookings
  const { data: categoriesData } = await supabase
    .from('vehicle_categories')
    .select('*')
    .order('name')
  
  const { data: vehiclesData } = await supabase
    .from('vehicles')
    .select('*')
    .order('make, model')
  
  const { data: bookingsData } = await supabase
    .from('bookings')
    .select('*')
    .neq('status', 'cancelled')
  
  const { data: locationsData } = await supabase
    .from('locations')
    .select('id, name')
    .order('name')
  
  // Build categories with vehicles structure
  const categories: CategoryWithVehicles[] = (categoriesData || []).map((category) => {
    const categoryVehicles = (vehiclesData || [])
      .filter((v) => v.category_id === category.id)
      .map((vehicle) => {
        const vehicleBookings: VehicleBooking[] = (bookingsData || [])
          .filter((b) => b.vehicle_id === vehicle.id)
          .map((b) => ({
            id: b.id,
            vehicle_id: b.vehicle_id,
            start_date: b.start_date,
            end_date: b.end_date,
            status: b.status,
            customer_name: b.customer_name,
            customer_phone: b.customer_phone,
            pickup_location_id: b.pickup_location_id,
            dropoff_location_id: b.dropoff_location_id,
            notes: b.notes,
            created_at: b.created_at,
            updated_at: b.updated_at,
          }))
        
        return {
          ...vehicle,
          bookings: vehicleBookings,
        } as VehicleWithBookings
      })
    
    return {
      ...category,
      vehicles: categoryVehicles,
    }
  }).filter(cat => cat.vehicles.length > 0)
  
  const locations = locationsData || []
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="h-6 w-6" />
                Booking Calendar
              </h1>
              <p className="text-muted-foreground">
                View availability and create vehicle bookings
              </p>
            </div>
          </div>
        </div>
        
        {/* Calendar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Fleet Availability</CardTitle>
            <CardDescription>
              Click on a date to start a booking. Click again on another date to complete the range.
              Hover over booked cells to see booking details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BookingCalendar 
              categories={categories} 
              locations={locations}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

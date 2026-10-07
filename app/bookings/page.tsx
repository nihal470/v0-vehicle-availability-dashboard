import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BookingsDashboard from '@/components/bookings/bookings-dashboard'

export default async function BookingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch vehicles with categories
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select(`
      *,
      category:vehicle_categories(*)
    `)
    .order('make', { ascending: true })

  // Fetch locations
  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .order('name', { ascending: true })

  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, mobile, email')
    .order('name', { ascending: true })

  // Fetch all bookings
  const { data: bookings } = await supabase
    .from('vehicle_bookings')
    .select(`
      *,
      vehicle:vehicles(
        *,
        category:vehicle_categories(*)
      )
    `)
    .order('start_date', { ascending: false })

  return (
    <BookingsDashboard
      vehicles={vehicles || []}
      locations={locations || []}
      customers={customers || []}
      bookings={bookings || []}
      userEmail={user.email || ''}
    />
  )
}

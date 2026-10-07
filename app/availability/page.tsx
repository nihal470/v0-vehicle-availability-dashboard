import { createClient } from '@/lib/supabase/server'
import { AvailabilityWorkspace } from '@/components/fleet/availability-workspace'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AvailabilityPage() {
  const supabase = await createClient()
  const [{ data: vehicles }, { data: categories }, { data: bookings }] = await Promise.all([
    supabase.from('vehicles').select('id, make, model, license_plate, status, category_id, customer_name, start_date, return_date, return_time, ag_no, total_rent, category:vehicle_categories(id, name)').order('make'),
    supabase.from('vehicle_categories').select('id, name').order('name'),
    supabase.from('vehicle_bookings').select('id, vehicle_id, customer_name, status, pickup_at, return_at, start_date, end_date').not('status', 'eq', 'cancelled'),
  ])

  return <AvailabilityWorkspace vehicles={(vehicles ?? []) as never} categories={categories ?? []} bookings={bookings ?? []} />
}

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BookingConfirmation from '@/components/bookings/booking-confirmation'

export default async function CustomerBookingConfirmationPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const supabase = await createClient()
  const { data } = await supabase.from('vehicle_bookings').select('*, vehicle:vehicles(*, category:vehicle_categories(*))').eq('id', (await params).bookingId).single()
  if (!data?.vehicle) notFound()
  return <BookingConfirmation booking={data as never} publicView />
}

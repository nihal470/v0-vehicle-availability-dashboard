import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BookingConfirmation from '@/components/bookings/booking-confirmation'

export default async function BookingConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data } = await supabase.from('vehicle_bookings').select('*, vehicle:vehicles(*, category:vehicle_categories(*))').eq('id', (await params).id).single()
  if (!data?.vehicle) notFound()
  return <BookingConfirmation booking={data as never} />
}

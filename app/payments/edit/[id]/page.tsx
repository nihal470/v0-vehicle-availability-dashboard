import { createClient } from '@/lib/supabase/server'
import { PaymentEntryForm } from '@/components/payments/payment-entry-form'
import { notFound } from 'next/navigation'

// Disable caching for real-time data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Edit Payment | Fleet Management',
  description: 'Edit payment receipt',
}

export default async function EditPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  
  // Fetch payment with items
  const { data: payment, error } = await supabase
    .from('payments')
    .select('*, items:payment_items(*)')
    .eq('id', id)
    .single()
  
  if (error || !payment) {
    notFound()
  }
  
  // Fetch vehicles for dropdown
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .order('license_plate')
  
  return (
    <div className="container mx-auto py-8 px-4">
      <PaymentEntryForm vehicles={vehicles || []} editPayment={payment} />
    </div>
  )
}

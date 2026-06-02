import { createClient } from '@/lib/supabase/server'
import { PaymentEntryForm } from '@/components/payments/payment-entry-form'

export const metadata = {
  title: 'New Payment Entry',
  description: 'Create a new payment receipt',
}

export default async function NewPaymentPage() {
  const supabase = await createClient()
  
  // Fetch active vehicles for linking
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .neq('status', 'returned')
    .order('license_plate')
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <PaymentEntryForm vehicles={vehicles || []} />
      </div>
    </main>
  )
}

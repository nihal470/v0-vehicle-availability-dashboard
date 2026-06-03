import { PaymentsList } from '@/components/payments/payments-list'
import { Suspense } from 'react'

// Disable caching for real-time data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Payments',
  description: 'View and manage payment receipts',
}

export default function PaymentsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading...</div>}>
          <PaymentsList />
        </Suspense>
      </div>
    </main>
  )
}

import { PaymentsList } from '@/components/payments/payments-list'
import { AccountingNav } from '@/components/accounting/accounting-nav'
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
    <div className="min-h-screen bg-muted/30">
      <AccountingNav />
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <Suspense fallback={<div>Loading...</div>}>
          <PaymentsList />
        </Suspense>
      </main>
    </div>
  )
}

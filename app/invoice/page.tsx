import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { RentalInvoice } from '@/components/invoices/rental-invoice'

export const metadata = {
  title: 'Rental Invoice | Travz Car Rental',
  description: 'Create and print a professional car rental invoice.',
}

export default function InvoicePage() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <div className="bg-white border-b px-6 py-4 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/payments">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Payments
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Rental Invoice</h1>
          <div className="w-32" />
        </div>
      </div>

      {/* Invoice content */}
      <div className="p-8 print:p-0">
        <Suspense fallback={<div className="text-center text-sm text-gray-500">Loading invoice...</div>}>
          <RentalInvoice />
        </Suspense>
      </div>
    </div>
  )
}

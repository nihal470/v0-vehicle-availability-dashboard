import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { SavedInvoicesList } from '@/components/invoices/saved-invoices-list'

export const metadata = {
  title: 'Saved Invoices | Travz Car Rental',
  description: 'View and manage saved rental invoices.',
}

export default function SavedInvoicesPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/payments">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Payments
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Invoices</h1>
          <div className="w-32" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <SavedInvoicesList />
      </div>
    </div>
  )
}

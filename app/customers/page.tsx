import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { AccountingNav } from '@/components/accounting/accounting-nav'
import { CustomersList } from '@/components/accounting/customers-list'

export default function CustomersPage() {
  return (
    <main className="min-h-screen bg-muted/30">
      <div className="border-b bg-background">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Home
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Customers</h1>
        </div>
        <div className="max-w-7xl mx-auto px-4 pb-2">
          <AccountingNav />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <CustomersList />
      </div>
    </main>
  )
}

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { CustomerLedger } from '@/components/accounting/customer-ledger'

export default async function CustomerLedgerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="border-b bg-background print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/customers">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Customers
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Customer Ledger</h1>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <CustomerLedger customerId={id} />
      </div>
    </main>
  )
}

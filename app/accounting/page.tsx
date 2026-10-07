import { AccountingNav } from '@/components/accounting/accounting-nav'
import { AccountingDashboard } from '@/components/accounting/accounting-dashboard'

export const metadata = {
  title: 'Accounting Dashboard | Travz Car Rental',
  description: 'Sales, VAT, collections, and receivables overview.',
}

export default function AccountingPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <AccountingNav />
      <main className="mx-auto max-w-[1400px] p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Accounting Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Financial overview of sales, collections, VAT, and outstanding receivables.
          </p>
        </div>
        <AccountingDashboard />
      </main>
    </div>
  )
}

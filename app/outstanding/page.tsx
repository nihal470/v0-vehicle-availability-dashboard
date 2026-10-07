import { AccountingNav } from '@/components/accounting/accounting-nav'
import { OutstandingReport } from '@/components/accounting/outstanding-report'

export const metadata = {
  title: 'Outstanding & Ageing | Travz Car Rental',
  description: 'Outstanding receivables, ageing report, and overdue reminders.',
}

export default function OutstandingPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <AccountingNav />
      <main className="mx-auto max-w-[1400px] p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Outstanding Management</h1>
          <p className="text-sm text-muted-foreground">
            Track receivables, ageing buckets, and overdue reminders across customers and companies.
          </p>
        </div>
        <OutstandingReport />
      </main>
    </div>
  )
}

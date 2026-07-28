import { AccountingNav } from '@/components/accounting/accounting-nav'
import { ReceiptVoucher } from '@/components/accounting/receipt-voucher'

export const metadata = {
  title: 'Receipt Voucher | Travz Car Rental',
  description: 'Record a customer receipt and allocate it across outstanding invoices.',
}

export default function NewReceiptPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <AccountingNav />
      <main className="mx-auto max-w-[1400px] p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Receipt Voucher</h1>
          <p className="text-sm text-muted-foreground">
            Select a customer, apply the received amount across outstanding invoices, and save the
            receipt voucher.
          </p>
        </div>
        <ReceiptVoucher />
      </main>
    </div>
  )
}

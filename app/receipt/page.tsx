import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { PaymentReceiptPreview, PaymentReceiptData } from '@/components/receipts/payment-receipt'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Payment Receipt | Fleet Management',
}

// Sample receipt for demonstration
const sampleReceipt: PaymentReceiptData = {
  companyName: 'Elegant Enterprises and Car Services LLC',
  companyLogo: '/images/company-logo.png',
  receiptNo: '99063004',
  receiptDate: new Date(),
  branchName: 'Head Office - Qurum',
  customerName: 'BREEZE BUSINESS INTEGRATED LLC',
  customerAddress: 'BUILDING NO 2/173 WAY 1200 PO 85 PC 112 AL HAIL NORTH\nMUSCAT Oman',
  customerPhone: '',
  debitorCode: '227257',
  paymentMode: 'BANK TRANSFER',
  currency: 'OMR',
  items: [
    {
      invoiceNo: '',
      raNo: '',
      vehicleRegNo: '',
      amount: 475.393
    }
  ],
  totalAmount: 475.393,
  amountInWords: 'FOUR HUNDRED SEVENTY FIVE OMAN RIYAL AND 39/100 BAIZA ONLY',
  remarks: 'Fund Trf., - BM',
  chequeNo: '20052026',
  referenceNo: '20052026',
  referenceDate: '2026-05-20',
  bankName: 'BANK MUSCAT',
  receivedBy: '9856 - Noorjan Said AB',
}

export default async function ReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const receiptId = params.id as string | undefined

  // If we have a receipt ID, fetch from database
  // For now, show sample receipt
  let receiptData: PaymentReceiptData = sampleReceipt

  if (receiptId) {
    // In a real implementation, fetch the receipt data from database
    // const supabase = await createClient()
    // const { data } = await supabase.from('receipts').select('*').eq('id', receiptId).single()
    // if (data) receiptData = data
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <div className="bg-white border-b px-6 py-4 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Payment Receipt</h1>
          <div className="w-32" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Receipt Content */}
      <div className="p-8 print:p-0">
        <Suspense fallback={<div className="text-center py-8">Loading receipt...</div>}>
          <PaymentReceiptPreview data={receiptData} />
        </Suspense>
      </div>
    </div>
  )
}

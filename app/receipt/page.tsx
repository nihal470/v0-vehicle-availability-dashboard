import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { PaymentReceiptPreview, PaymentReceiptData } from '@/components/receipts/payment-receipt'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Payment Receipt | Fleet Management',
}

// Number to words converter
function numberToWords(num: number): string {
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN']
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']
  
  if (num === 0) return 'ZERO'
  
  const convertLessThanThousand = (n: number): string => {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    return ones[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '')
  }
  
  const whole = Math.floor(num)
  const decimal = Math.round((num - whole) * 1000)
  
  let result = ''
  if (whole >= 1000000) {
    result += convertLessThanThousand(Math.floor(whole / 1000000)) + ' MILLION '
    result += convertLessThanThousand(Math.floor((whole % 1000000) / 1000)) + ' THOUSAND '
    result += convertLessThanThousand(whole % 1000)
  } else if (whole >= 1000) {
    result += convertLessThanThousand(Math.floor(whole / 1000)) + ' THOUSAND '
    result += convertLessThanThousand(whole % 1000)
  } else {
    result = convertLessThanThousand(whole)
  }
  
  result = result.trim() + ' OMAN RIYAL'
  if (decimal > 0) {
    result += ' AND ' + decimal + '/1000 BAIZA'
  }
  result += ' ONLY'
  
  return result
}

export default async function ReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const receiptNo = params.receiptNo as string | undefined
  const shouldPrint = params.print === 'true'

  let receiptData: PaymentReceiptData | null = null

  if (receiptNo) {
    const supabase = await createClient()
    
    // Fetch payment with items
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*, vehicle:vehicles(*)')
      .eq('receipt_no', receiptNo)
      .single()
    
    if (payment && !error) {
      // Fetch payment items
      const { data: items } = await supabase
        .from('payment_items')
        .select('*')
        .eq('payment_id', payment.id)
      
      receiptData = {
        companyName: 'Elegant Enterprises and Car Services LLC',
        companyLogo: '/images/company-logo.png',
        receiptNo: payment.receipt_no,
        receiptDate: new Date(payment.receipt_date),
        branchName: payment.branch_name || '',
        customerName: payment.customer_name,
        customerAddress: payment.customer_address || '',
        customerPhone: payment.customer_phone || '',
        debitorCode: payment.debitor_code || '',
        paymentMode: payment.payment_mode.toUpperCase().replace('_', ' '),
        currency: payment.currency || 'OMR',
        items: items?.map(item => ({
          invoiceNo: item.invoice_no || '',
          raNo: item.ra_no || '',
          vehicleRegNo: item.vehicle_reg_no || '',
          amount: Number(item.amount)
        })) || [{
          invoiceNo: '',
          raNo: payment.agreement_no || '',
          vehicleRegNo: payment.vehicle?.license_plate || '',
          amount: Number(payment.total_amount)
        }],
        totalAmount: Number(payment.total_amount),
        amountInWords: numberToWords(Number(payment.total_amount)),
        remarks: payment.remarks || '',
        chequeNo: payment.cheque_no || '',
        referenceNo: payment.reference_no || '',
        referenceDate: payment.reference_date || '',
        bankName: payment.bank_name || '',
        receivedBy: payment.received_by || '',
      }
    }
  }

  // If no receipt found, show sample
  if (!receiptData) {
    receiptData = {
      companyName: 'Elegant Enterprises and Car Services LLC',
      companyLogo: '/images/company-logo.png',
      receiptNo: '99063004',
      receiptDate: new Date(),
      branchName: 'Head Office - Qurum',
      customerName: 'SAMPLE CUSTOMER',
      customerAddress: 'Sample Address',
      customerPhone: '',
      debitorCode: '000001',
      paymentMode: 'CASH',
      currency: 'OMR',
      items: [{ invoiceNo: '', raNo: '', vehicleRegNo: '', amount: 100 }],
      totalAmount: 100,
      amountInWords: 'ONE HUNDRED OMAN RIYAL ONLY',
      remarks: 'Sample Receipt',
      chequeNo: '',
      referenceNo: '',
      referenceDate: '',
      bankName: '',
      receivedBy: '',
    }
  }

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
          <h1 className="text-lg font-semibold">Payment Receipt #{receiptData.receiptNo}</h1>
          <div className="w-32" />
        </div>
      </div>

      {/* Receipt Content */}
      <div className="p-8 print:p-0">
        <Suspense fallback={<div className="text-center py-8">Loading receipt...</div>}>
          <PaymentReceiptPreview data={receiptData} autoPrint={shouldPrint} />
        </Suspense>
      </div>
    </div>
  )
}

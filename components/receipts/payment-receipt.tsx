'use client'

import { useRef } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Printer, Download } from 'lucide-react'

export interface PaymentReceiptData {
  // Company Info
  companyName?: string
  companyLogo?: string
  
  // Receipt Details
  receiptNo: string
  receiptDate: string | Date
  branchName?: string
  
  // Customer Info
  customerName: string
  customerAddress?: string
  customerPhone?: string
  debitorCode?: string
  
  // Payment Details
  paymentMode: string
  currency?: string
  
  // Line Items
  items: {
    invoiceNo?: string
    raNo?: string
    vehicleRegNo?: string
    amount: number
  }[]
  
  // Total
  totalAmount: number
  amountInWords?: string
  
  // Additional Info
  remarks?: string
  chequeNo?: string
  referenceNo?: string
  referenceDate?: string | Date
  bankName?: string
  receivedBy?: string
}

interface Props {
  data: PaymentReceiptData
  onPrint?: () => void
}

// Convert number to words in English
function numberToWords(num: number): string {
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
    'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN']
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']
  const scales = ['', 'THOUSAND', 'MILLION', 'BILLION']

  if (num === 0) return 'ZERO'

  const intPart = Math.floor(num)
  const decPart = Math.round((num - intPart) * 1000)

  let words = ''
  let scaleIndex = 0

  let n = intPart
  while (n > 0) {
    const chunk = n % 1000
    if (chunk > 0) {
      let chunkWords = ''
      const hundreds = Math.floor(chunk / 100)
      const remainder = chunk % 100

      if (hundreds > 0) {
        chunkWords += ones[hundreds] + ' HUNDRED '
      }

      if (remainder > 0) {
        if (remainder < 20) {
          chunkWords += ones[remainder]
        } else {
          chunkWords += tens[Math.floor(remainder / 10)]
          if (remainder % 10 > 0) {
            chunkWords += ' ' + ones[remainder % 10]
          }
        }
      }

      words = chunkWords.trim() + ' ' + scales[scaleIndex] + ' ' + words
    }
    n = Math.floor(n / 1000)
    scaleIndex++
  }

  // Add decimal part
  if (decPart > 0) {
    words = words.trim() + ' AND ' + decPart + '/1000'
  }

  return words.trim()
}

export function PaymentReceipt({ data, onPrint }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    if (onPrint) {
      onPrint()
    } else {
      window.print()
    }
  }

  const formatDate = (date: string | Date) => {
    if (!date) return ''
    const d = typeof date === 'string' ? new Date(date) : date
    return format(d, 'dd/MM/yyyy')
  }

  const amountInWords = data.amountInWords || 
    `${numberToWords(data.totalAmount)} ${data.currency || 'OMAN RIYAL'} ONLY`

  return (
    <div className="space-y-4">
      {/* Print Controls */}
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print Receipt
        </Button>
      </div>

      {/* Receipt Document */}
      <div 
        ref={receiptRef}
        className="bg-white border border-gray-300 shadow-sm max-w-4xl mx-auto print:shadow-none print:border-none"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header with Logo */}
        <div className="bg-black text-white p-6">
          <div className="flex items-center justify-center">
            {data.companyLogo ? (
              <img src={data.companyLogo} alt="Logo" className="h-20 w-auto object-contain" />
            ) : (
              <div className="text-center">
                <div className="text-3xl font-bold tracking-[0.3em] mb-2">CAR RENTAL</div>
              </div>
            )}
          </div>
          <div className="text-center mt-3">
            <p className="text-sm font-medium tracking-wide">{data.companyName || 'Elegant Enterprises and Car Services LLC'}</p>
          </div>
        </div>

        {/* Receipt Title */}
        <div className="text-center py-4 border-b-2 border-gray-800">
          <h1 className="text-2xl font-bold tracking-wide">
            RECEIPT - الإيصال
          </h1>
        </div>

        {/* Customer & Receipt Info */}
        <div className="p-6 grid grid-cols-2 gap-8 border-b">
          {/* Left - Customer Info */}
          <div className="space-y-2">
            <div className="flex justify-between border-b pb-1">
              <span className="font-semibold">Received From</span>
              <span className="text-right font-semibold text-gray-600">استلمت من</span>
            </div>
            <div className="text-sm space-y-1 pt-2">
              <p className="font-bold text-lg">{data.customerName}</p>
              {data.customerAddress && (
                <p className="text-gray-600 text-xs leading-relaxed">{data.customerAddress}</p>
              )}
              {data.customerPhone && (
                <p className="text-gray-600">Tel/Fax: {data.customerPhone}</p>
              )}
              {data.debitorCode && (
                <p className="text-gray-600">Debitor Code: {data.debitorCode}</p>
              )}
            </div>
          </div>

          {/* Right - Receipt Details */}
          <div className="space-y-2">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="py-1.5 font-medium">Receipt No.</td>
                  <td className="py-1.5 font-bold text-right">{data.receiptNo}</td>
                  <td className="py-1.5 text-right text-gray-500">رقم الإيصال</td>
                </tr>
                <tr className="border-b">
                  <td className="py-1.5 font-medium">Receipt Date</td>
                  <td className="py-1.5 font-bold text-right">{formatDate(data.receiptDate)}</td>
                  <td className="py-1.5 text-right text-gray-500">التاريخ</td>
                </tr>
                {data.branchName && (
                  <tr className="border-b">
                    <td className="py-1.5 font-medium">Branch Name</td>
                    <td className="py-1.5 text-right">{data.branchName}</td>
                    <td className="py-1.5 text-right text-gray-500">اسم الفرع</td>
                  </tr>
                )}
                <tr className="border-b">
                  <td className="py-1.5 font-medium">Payment Mode</td>
                  <td className="py-1.5 text-right">{data.paymentMode}</td>
                  <td className="py-1.5 text-right text-gray-500">طريقة السداد</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-medium">Currency</td>
                  <td className="py-1.5 text-right">{data.currency || 'OMR'}</td>
                  <td className="py-1.5 text-right text-gray-500">العملة</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Items Table */}
        <div className="p-6 border-b">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">
                  S.No<br /><span className="text-gray-500 font-normal text-xs">رقم</span>
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">
                  INVOICE No.<br /><span className="text-gray-500 font-normal text-xs">رقم الفاتورة</span>
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">
                  RA NO.<br /><span className="text-gray-500 font-normal text-xs">رقم عقد التأجير</span>
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">
                  VEH. REG. NO.<br /><span className="text-gray-500 font-normal text-xs">رقم تسجيل السيارة</span>
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">
                  AMOUNT<br /><span className="text-gray-500 font-normal text-xs">المبلغ</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-3 py-2 text-center">{index + 1}</td>
                  <td className="border border-gray-300 px-3 py-2">{item.invoiceNo || '-'}</td>
                  <td className="border border-gray-300 px-3 py-2">{item.raNo || '-'}</td>
                  <td className="border border-gray-300 px-3 py-2 font-mono">{item.vehicleRegNo || '-'}</td>
                  <td className="border border-gray-300 px-3 py-2 text-right font-semibold">
                    {item.amount.toFixed(3)}
                  </td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="bg-gray-50 font-bold">
                <td colSpan={4} className="border border-gray-300 px-3 py-2 text-right">
                  Total <span className="text-gray-500 font-normal mr-4">المجموع</span>
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right text-lg">
                  {data.totalAmount.toFixed(3)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in Words */}
        <div className="px-6 py-3 border-b bg-gray-50">
          <p className="text-sm">
            <span className="font-semibold">Amount In Words: </span>
            <span className="uppercase">{amountInWords}</span>
          </p>
        </div>

        {/* Remarks */}
        {data.remarks && (
          <div className="px-6 py-3 border-b">
            <p className="text-sm">
              <span className="font-semibold">REMARKS: </span>
              <span>{data.remarks}</span>
            </p>
          </div>
        )}

        {/* Bank & Reference Details */}
        <div className="p-6 grid grid-cols-2 gap-8 border-b">
          <table className="text-sm">
            <tbody>
              {data.chequeNo && (
                <tr>
                  <td className="py-1 font-medium">Cheque / Card No:</td>
                  <td className="py-1 pl-4">{data.chequeNo}</td>
                  <td className="py-1 text-right text-gray-500">رقم الشيك</td>
                </tr>
              )}
              {data.bankName && (
                <tr>
                  <td className="py-1 font-medium">Bank:</td>
                  <td className="py-1 pl-4 font-semibold">{data.bankName}</td>
                  <td className="py-1 text-right text-gray-500">البنك</td>
                </tr>
              )}
            </tbody>
          </table>
          <table className="text-sm">
            <tbody>
              {data.referenceNo && (
                <tr>
                  <td className="py-1 font-medium">Reference No.:</td>
                  <td className="py-1 pl-4">{data.referenceNo}</td>
                </tr>
              )}
              {data.referenceDate && (
                <tr>
                  <td className="py-1 font-medium">Reference Date:</td>
                  <td className="py-1 pl-4">{formatDate(data.referenceDate)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Received By */}
        {data.receivedBy && (
          <div className="px-6 py-4 border-b">
            <p className="text-sm">
              <span className="font-semibold">Received By: </span>
              <span>{data.receivedBy}</span>
              <span className="text-gray-500 ml-4">المستلم</span>
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-100 text-center">
          <p className="text-xs text-gray-600">
            THIS IS A SYSTEM GENERATED DOCUMENT AND DOES NOT REQUIRE TO BE SIGNED / STAMP.
          </p>
          <p className="text-xs text-gray-500 mt-1" dir="rtl">
            هذه المستندات معتمدة ولا تحتاج توقيع أو ختم
          </p>
        </div>
      </div>
    </div>
  )
}

// Preview/Print wrapper component
export function PaymentReceiptPreview({ data }: { data: PaymentReceiptData }) {
  return (
    <div className="min-h-screen bg-gray-100 p-8 print:p-0 print:bg-white">
      <PaymentReceipt data={data} />
    </div>
  )
}

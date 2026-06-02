'use client'

import { useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

export interface PaymentReceiptData {
  companyName?: string
  companyLogo?: string
  receiptNo: string
  receiptDate: string | Date
  branchName?: string
  customerName: string
  customerAddress?: string
  customerPhone?: string
  debitorCode?: string
  paymentMode: string
  currency?: string
  items: {
    invoiceNo?: string
    raNo?: string
    vehicleRegNo?: string
    amount: number
  }[]
  totalAmount: number
  amountInWords?: string
  remarks?: string
  chequeNo?: string
  referenceNo?: string
  referenceDate?: string | Date
  bankName?: string
  receivedBy?: string
}

interface Props {
  data: PaymentReceiptData
  autoPrint?: boolean
}

export function PaymentReceiptPreview({ data, autoPrint }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoPrint) {
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [autoPrint])

  const handlePrint = () => {
    window.print()
  }

  const formatDate = (date: string | Date) => {
    if (!date) return ''
    const d = typeof date === 'string' ? new Date(date) : date
    return format(d, 'dd/MM/yyyy')
  }

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
        <div className="bg-white p-6 border-b">
          <div className="flex items-center justify-center">
            {data.companyLogo ? (
              <img src={data.companyLogo} alt="Logo" className="h-20 w-auto object-contain" />
            ) : (
              <div className="text-center">
                <div className="text-3xl font-bold tracking-[0.3em] mb-2 text-gray-900">CAR RENTAL</div>
              </div>
            )}
          </div>
          <div className="text-center mt-3">
            <p className="text-sm font-medium tracking-wide text-gray-800">{data.companyName || 'BREEZE BUSINESS INTEGRATED LLC'}</p>
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
                <p className="text-gray-600 text-xs leading-relaxed whitespace-pre-line">{data.customerAddress}</p>
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
            <span className="uppercase">{data.amountInWords}</span>
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
        {(data.chequeNo || data.bankName || data.referenceNo) && (
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
        )}

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

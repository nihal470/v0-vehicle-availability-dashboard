'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

const COMPANY = {
  name: 'Travz Car Rental',
  legal: 'Breeze Business Integrated LLC',
  address: 'Muscat, Sultanate of Oman',
  phone: '+968 9536 1234',
  email: 'info@travzcarrental.com',
  website: 'www.travzcarrental.com',
  crNo: '1458587',
  vatTin: 'OM1100368236',
}

interface ChargeRow {
  description: string
  qty: string
  rate: string
}

const DEFAULT_CHARGES: ChargeRow[] = [
  { description: 'Car Rental', qty: '', rate: '' },
  { description: 'Airport Delivery', qty: '', rate: '' },
  { description: 'Child Seat', qty: '', rate: '' },
  { description: 'GPS', qty: '', rate: '' },
  { description: 'CDW Insurance', qty: '', rate: '' },
  { description: 'Extra Driver', qty: '', rate: '' },
  { description: 'Fuel Charge', qty: '', rate: '' },
  { description: 'Traffic Fines', qty: '', rate: '' },
  { description: 'Other Charges', qty: '', rate: '' },
]

function genInvoiceNo() {
  const d = new Date()
  const y = d.getFullYear()
  const seq = d.getTime().toString().slice(-5)
  return `INV-${y}-${seq}`
}

/** Borderless input that reads like document text but stays editable, and prints cleanly. */
function Field({
  value,
  onChange,
  placeholder,
  className = '',
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-transparent outline-none border-b border-dashed border-gray-300 focus:border-blue-600 px-1 py-0.5 print:border-none print:placeholder:text-transparent ${className}`}
    />
  )
}

export function RentalInvoice() {
  const [invoiceNo, setInvoiceNo] = useState(genInvoiceNo())
  const [reservationNo, setReservationNo] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Pending'>('Pending')

  const [customer, setCustomer] = useState({
    name: '',
    passport: '',
    nationality: '',
    licence: '',
    mobile: '',
    email: '',
  })

  const [rental, setRental] = useState({
    vehicle: '',
    regNo: '',
    pickupDateTime: '',
    returnDateTime: '',
    pickupLocation: '',
    returnLocation: '',
    duration: '',
  })

  const [charges, setCharges] = useState<ChargeRow[]>(DEFAULT_CHARGES)
  const [discount, setDiscount] = useState('')
  const vatRate = 5

  const [payment, setPayment] = useState({
    method: '',
    transactionRef: '',
    amountPaid: '',
  })

  const updateCharge = (index: number, field: keyof ChargeRow, value: string) => {
    setCharges((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const rowAmount = (row: ChargeRow) => {
    const qty = parseFloat(row.qty)
    const rate = parseFloat(row.rate)
    if (isNaN(rate)) return 0
    return (isNaN(qty) ? 1 : qty) * rate
  }

  const subtotal = useMemo(
    () => charges.reduce((sum, row) => sum + rowAmount(row), 0),
    [charges]
  )
  const discountValue = parseFloat(discount) || 0
  const taxable = Math.max(subtotal - discountValue, 0)
  const vatValue = (taxable * vatRate) / 100
  const grandTotal = taxable + vatValue
  const amountPaidValue = parseFloat(payment.amountPaid) || 0
  const balanceDue = grandTotal - amountPaidValue

  const money = (n: number) => n.toFixed(3)

  return (
    <div className="space-y-4">
      {/* Print controls */}
      <div className="flex justify-end gap-2 print:hidden max-w-4xl mx-auto">
        <select
          value={paymentStatus}
          onChange={(e) => setPaymentStatus(e.target.value as 'Paid' | 'Pending')}
          className="border rounded-md px-3 py-1.5 text-sm"
          aria-label="Payment status"
        >
          <option value="Pending">Pending</option>
          <option value="Paid">Paid</option>
        </select>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />
          Print / Save PDF
        </Button>
      </div>

      {/* Invoice document */}
      <div
        className="invoice-sheet bg-white border border-gray-300 shadow-sm mx-auto print:shadow-none print:border-none"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif', width: '210mm', minHeight: '297mm' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-6 p-8 border-b-4 border-blue-800">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/company-logo.png"
              alt={`${COMPANY.name} logo`}
              className="h-16 w-auto object-contain"
            />
            <div className="text-xs text-gray-600 leading-relaxed">
              <p className="text-base font-bold text-gray-900">{COMPANY.name}</p>
              <p className="font-medium text-gray-700">{COMPANY.legal}</p>
              <p>{COMPANY.address}</p>
              <p>{COMPANY.phone}</p>
              <p>{COMPANY.email}</p>
              <p>{COMPANY.website}</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-bold tracking-tight text-blue-800">INVOICE</h1>
            <p className="text-xs text-gray-500 mt-1">CR No: {COMPANY.crNo}</p>
            <p className="text-xs text-gray-500">VAT TIN: {COMPANY.vatTin}</p>
            <div className="mt-3 inline-block">
              <span
                className={`inline-block rounded-full px-4 py-1 text-sm font-semibold ${
                  paymentStatus === 'Paid'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {paymentStatus.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Invoice meta + Customer */}
        <div className="grid grid-cols-2 gap-8 p-8 border-b">
          {/* Invoice details */}
          <div>
            <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-3">
              Invoice Details
            </h2>
            <table className="w-full text-sm">
              <tbody className="align-middle">
                <tr>
                  <td className="py-1 w-40 text-gray-600">Invoice Number</td>
                  <td className="py-1"><Field value={invoiceNo} onChange={setInvoiceNo} placeholder="INV-0000" /></td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-600">Reservation Number</td>
                  <td className="py-1"><Field value={reservationNo} onChange={setReservationNo} placeholder="RES-0000" /></td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-600">Invoice Date</td>
                  <td className="py-1"><Field type="date" value={invoiceDate} onChange={setInvoiceDate} /></td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-600">Due Date</td>
                  <td className="py-1"><Field type="date" value={dueDate} onChange={setDueDate} /></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Customer information */}
          <div>
            <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-3">
              Bill To
            </h2>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 w-36 text-gray-600">Customer Name</td>
                  <td className="py-1"><Field value={customer.name} onChange={(v) => setCustomer({ ...customer, name: v })} placeholder="Full name" /></td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-600">Passport / ID No</td>
                  <td className="py-1"><Field value={customer.passport} onChange={(v) => setCustomer({ ...customer, passport: v })} placeholder="Passport / ID" /></td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-600">Nationality</td>
                  <td className="py-1"><Field value={customer.nationality} onChange={(v) => setCustomer({ ...customer, nationality: v })} placeholder="Nationality" /></td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-600">Driving Licence No</td>
                  <td className="py-1"><Field value={customer.licence} onChange={(v) => setCustomer({ ...customer, licence: v })} placeholder="Licence number" /></td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-600">Mobile Number</td>
                  <td className="py-1"><Field value={customer.mobile} onChange={(v) => setCustomer({ ...customer, mobile: v })} placeholder="+968 ..." /></td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-600">Email Address</td>
                  <td className="py-1"><Field type="email" value={customer.email} onChange={(v) => setCustomer({ ...customer, email: v })} placeholder="email@example.com" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Rental details */}
        <div className="p-8 border-b">
          <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-3">
            Rental Details
          </h2>
          <div className="grid grid-cols-2 gap-x-8">
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 w-40 text-gray-600">Vehicle Make &amp; Model</td>
                  <td className="py-1"><Field value={rental.vehicle} onChange={(v) => setRental({ ...rental, vehicle: v })} placeholder="e.g. Toyota Corolla" /></td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-600">Registration Number</td>
                  <td className="py-1"><Field value={rental.regNo} onChange={(v) => setRental({ ...rental, regNo: v })} placeholder="e.g. 1234 A" /></td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-600">Pickup Date &amp; Time</td>
                  <td className="py-1"><Field type="datetime-local" value={rental.pickupDateTime} onChange={(v) => setRental({ ...rental, pickupDateTime: v })} /></td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-600">Return Date &amp; Time</td>
                  <td className="py-1"><Field type="datetime-local" value={rental.returnDateTime} onChange={(v) => setRental({ ...rental, returnDateTime: v })} /></td>
                </tr>
              </tbody>
            </table>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 w-36 text-gray-600">Pickup Location</td>
                  <td className="py-1"><Field value={rental.pickupLocation} onChange={(v) => setRental({ ...rental, pickupLocation: v })} placeholder="Pickup location" /></td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-600">Return Location</td>
                  <td className="py-1"><Field value={rental.returnLocation} onChange={(v) => setRental({ ...rental, returnLocation: v })} placeholder="Return location" /></td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-600">Rental Duration (Days)</td>
                  <td className="py-1"><Field type="number" value={rental.duration} onChange={(v) => setRental({ ...rental, duration: v })} placeholder="0" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Charges table */}
        <div className="p-8 border-b">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-blue-800 text-white">
                <th className="text-left px-3 py-2 font-semibold">Description</th>
                <th className="text-right px-3 py-2 font-semibold w-20">Qty</th>
                <th className="text-right px-3 py-2 font-semibold w-32">Rate (OMR)</th>
                <th className="text-right px-3 py-2 font-semibold w-36">Amount (OMR)</th>
              </tr>
            </thead>
            <tbody>
              {charges.map((row, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="px-2 py-1">
                    <Field value={row.description} onChange={(v) => updateCharge(index, 'description', v)} placeholder="Description" />
                  </td>
                  <td className="px-2 py-1">
                    <Field type="number" value={row.qty} onChange={(v) => updateCharge(index, 'qty', v)} placeholder="-" className="text-right" />
                  </td>
                  <td className="px-2 py-1">
                    <Field type="number" value={row.rate} onChange={(v) => updateCharge(index, 'rate', v)} placeholder="-" className="text-right" />
                  </td>
                  <td className="px-3 py-1 text-right font-medium tabular-nums">
                    {rowAmount(row) > 0 ? money(rowAmount(row)) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mt-4">
            <table className="text-sm w-72">
              <tbody>
                <tr>
                  <td className="py-1 text-gray-600">Subtotal</td>
                  <td className="py-1 text-right font-medium tabular-nums">{money(subtotal)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-600">Discount</td>
                  <td className="py-1 text-right">
                    <div className="flex justify-end">
                      <div className="w-24"><Field type="number" value={discount} onChange={setDiscount} placeholder="0.000" className="text-right" /></div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-600">VAT ({vatRate}%)</td>
                  <td className="py-1 text-right font-medium tabular-nums">{money(vatValue)}</td>
                </tr>
                <tr className="border-t-2 border-blue-800">
                  <td className="py-2 font-bold text-blue-800">Grand Total (OMR)</td>
                  <td className="py-2 text-right font-bold text-lg text-blue-800 tabular-nums">{money(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment information */}
        <div className="grid grid-cols-2 gap-8 p-8 border-b">
          <div>
            <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-3">
              Payment Information
            </h2>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 w-36 text-gray-600">Payment Method</td>
                  <td className="py-1"><Field value={payment.method} onChange={(v) => setPayment({ ...payment, method: v })} placeholder="Cash / Card / Transfer" /></td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-600">Transaction Ref</td>
                  <td className="py-1"><Field value={payment.transactionRef} onChange={(v) => setPayment({ ...payment, transactionRef: v })} placeholder="Reference" /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex items-end">
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 text-gray-600">Amount Paid (OMR)</td>
                  <td className="py-1 text-right">
                    <div className="flex justify-end">
                      <div className="w-28"><Field type="number" value={payment.amountPaid} onChange={(v) => setPayment({ ...payment, amountPaid: v })} placeholder="0.000" className="text-right" /></div>
                    </div>
                  </td>
                </tr>
                <tr className="border-t border-gray-300">
                  <td className="py-2 font-semibold text-gray-800">Balance Due (OMR)</td>
                  <td className="py-2 text-right font-bold tabular-nums">{money(balanceDue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Terms & signatures */}
        <div className="p-8">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-2">
                Terms &amp; Conditions
              </h2>
              <ul className="text-xs text-gray-600 list-disc pl-4 space-y-1 leading-relaxed">
                <li>Vehicle must be returned on time.</li>
                <li>Traffic fines and damages are the renter&apos;s responsibility.</li>
                <li>VAT included as per Oman regulations.</li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-6 items-end">
              <div className="text-center">
                <div className="border-t border-gray-400 pt-1 text-xs text-gray-600">
                  Customer Signature
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-gray-400 pt-1 text-xs text-gray-600">
                  Authorized Signature
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer-bar bg-blue-800 text-white text-center py-3 px-8">
          <p className="text-sm">Thank you for choosing {COMPANY.name}. We appreciate your business.</p>
        </div>
      </div>

      {/* Print sizing */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html,
          body {
            background: white !important;
          }
          /* Fit the sheet exactly to the printable A4 area, single page */
          .invoice-sheet {
            width: 210mm !important;
            min-height: 0 !important;
            height: auto !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 4mm 8mm !important;
            box-sizing: border-box !important;
            font-size: 10px !important;
            line-height: 1.25 !important;
            overflow: hidden !important;
          }
          /* Collapse the generous section padding so everything stacks onto one page */
          .invoice-sheet .p-8 {
            padding: 6px 0 !important;
          }
          /* Tighten vertical rhythm */
          .invoice-sheet table td,
          .invoice-sheet table th {
            padding-top: 1px !important;
            padding-bottom: 1px !important;
          }
          .invoice-sheet .mb-3 {
            margin-bottom: 4px !important;
          }
          .invoice-sheet .mt-4 {
            margin-top: 6px !important;
          }
          .invoice-sheet .py-2 {
            padding-top: 3px !important;
            padding-bottom: 3px !important;
          }
          /* Shrink oversized display elements */
          .invoice-sheet h1 {
            font-size: 22px !important;
          }
          .invoice-sheet img {
            height: 44px !important;
          }
          .invoice-sheet .text-lg {
            font-size: 13px !important;
          }
          /* Keep the header/footer color bars in print */
          .invoice-sheet .bg-blue-800 {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .invoice-sheet .footer-bar {
            padding-top: 6px !important;
            padding-bottom: 6px !important;
          }
        }
      `}</style>
    </div>
  )
}

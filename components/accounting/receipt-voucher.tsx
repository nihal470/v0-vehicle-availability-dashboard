'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  Search,
  Wand2,
  X,
  Check,
  ReceiptText,
  AlertCircle,
} from 'lucide-react'
import {
  getCustomers,
  getInvoicesWithBalances,
  saveReceiptVoucher,
  money,
  type Customer,
  type InvoiceWithBalance,
} from '@/lib/accounting'

type SortField = 'invoice_no' | 'invoice_date' | 'due_date' | 'outstanding'

function genVoucherNo() {
  const d = new Date()
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate()
  ).padStart(2, '0')}`
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `RV-${stamp}-${rand}`
}

function round3(n: number) {
  return Math.round((n + Number.EPSILON) * 1000) / 1000
}

export function ReceiptVoucher() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [allInvoices, setAllInvoices] = useState<InvoiceWithBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [customerId, setCustomerId] = useState<string>('')

  // Filters
  const [search, setSearch] = useState('')
  const [minOutstanding, setMinOutstanding] = useState('')
  const [sortField, setSortField] = useState<SortField>('invoice_date')

  // Allocation state: invoice_id -> allocated amount (string for input control)
  const [allocations, setAllocations] = useState<Record<string, string>>({})

  // Receipt voucher header
  const [voucherNo, setVoucherNo] = useState(genVoucherNo())
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [method, setMethod] = useState('Cash')
  const [channel, setChannel] = useState<'Cash' | 'Bank'>('Cash')
  const [reference, setReference] = useState('')
  const [receivedAmount, setReceivedAmount] = useState('')

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getCustomers(), getInvoicesWithBalances()])
      .then(([cust, invs]) => {
        setCustomers(cust)
        setAllInvoices(invs)
      })
      .catch((err) => {
        console.error('[v0] Failed to load receipt data:', err)
        setMessage('Failed to load customers and invoices.')
      })
      .finally(() => setLoading(false))
  }, [])

  // Outstanding invoices for the selected customer (unpaid / partially paid only)
  const customerInvoices = useMemo(() => {
    if (!customerId) return []
    return allInvoices.filter(
      (inv) => inv.customer_id === customerId && inv.outstanding > 0.0005
    )
  }, [allInvoices, customerId])

  // Apply search + filters + sort
  const visibleInvoices = useMemo(() => {
    let list = [...customerInvoices]
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (inv) =>
          inv.invoice_no?.toLowerCase().includes(q) ||
          inv.invoice_date?.toLowerCase().includes(q) ||
          inv.due_date?.toLowerCase().includes(q) ||
          inv.rental_vehicle?.toLowerCase().includes(q) ||
          inv.rental_reg_no?.toLowerCase().includes(q)
      )
    }
    const min = Number.parseFloat(minOutstanding)
    if (!Number.isNaN(min) && min > 0) {
      list = list.filter((inv) => inv.outstanding >= min)
    }
    list.sort((a, b) => {
      switch (sortField) {
        case 'invoice_no':
          return (a.invoice_no || '').localeCompare(b.invoice_no || '')
        case 'due_date':
          return (a.due_date || a.invoice_date || '').localeCompare(
            b.due_date || b.invoice_date || ''
          )
        case 'outstanding':
          return b.outstanding - a.outstanding
        case 'invoice_date':
        default:
          return (a.invoice_date || a.created_at).localeCompare(
            b.invoice_date || b.created_at
          )
      }
    })
    return list
  }, [customerInvoices, search, minOutstanding, sortField])

  const received = Number.parseFloat(receivedAmount) || 0

  const totalAllocated = useMemo(() => {
    return round3(
      Object.values(allocations).reduce((s, v) => s + (Number.parseFloat(v) || 0), 0)
    )
  }, [allocations])

  const selectedCount = useMemo(
    () => Object.values(allocations).filter((v) => (Number.parseFloat(v) || 0) > 0.0005).length,
    [allocations]
  )

  const unapplied = round3(Math.max(received - totalAllocated, 0))
  const overAllocated = totalAllocated - received > 0.0005 && received > 0

  const selectedCustomer = customers.find((c) => c.id === customerId)

  // ---- Allocation helpers ----

  const setAllocation = (inv: InvoiceWithBalance, value: string) => {
    const num = Number.parseFloat(value)
    if (value === '') {
      setAllocations((prev) => {
        const next = { ...prev }
        delete next[inv.id]
        return next
      })
      return
    }
    // Clamp to the invoice's outstanding balance
    const clamped = Number.isNaN(num) ? 0 : Math.min(round3(num), round3(inv.outstanding))
    setAllocations((prev) => ({ ...prev, [inv.id]: String(clamped) }))
  }

  const toggleInvoice = (inv: InvoiceWithBalance, checked: boolean) => {
    if (checked) {
      // Apply full outstanding (or the remaining received amount if smaller and received is set)
      setAllocations((prev) => ({ ...prev, [inv.id]: String(round3(inv.outstanding)) }))
    } else {
      setAllocations((prev) => {
        const next = { ...prev }
        delete next[inv.id]
        return next
      })
    }
  }

  const applyFull = (inv: InvoiceWithBalance) => {
    setAllocations((prev) => ({ ...prev, [inv.id]: String(round3(inv.outstanding)) }))
  }

  /** Auto-allocate the received amount to the oldest invoices first. */
  const autoAllocate = () => {
    if (received <= 0) {
      setMessage('Enter a received amount before auto-allocating.')
      return
    }
    setMessage(null)
    // Oldest first by invoice date (fallback due date)
    const ordered = [...customerInvoices].sort((a, b) =>
      (a.invoice_date || a.created_at).localeCompare(b.invoice_date || b.created_at)
    )
    let remaining = received
    const next: Record<string, string> = {}
    for (const inv of ordered) {
      if (remaining <= 0.0005) break
      const alloc = Math.min(round3(inv.outstanding), round3(remaining))
      if (alloc > 0.0005) {
        next[inv.id] = String(alloc)
        remaining = round3(remaining - alloc)
      }
    }
    setAllocations(next)
  }

  const clearSelection = () => {
    setAllocations({})
    setMessage(null)
  }

  const resetVoucher = () => {
    setAllocations({})
    setReceivedAmount('')
    setReference('')
    setVoucherNo(genVoucherNo())
    setPaymentDate(new Date().toISOString().split('T')[0])
    setSaveState('idle')
    setMessage(null)
  }

  const handleCustomerChange = (id: string) => {
    setCustomerId(id)
    setAllocations({})
    setSearch('')
    setMinOutstanding('')
    setMessage(null)
    setSaveState('idle')
  }

  // ---- Save ----

  const canSave =
    !!customerId && selectedCount > 0 && totalAllocated > 0.0005 && !overAllocated

  const handleSave = async () => {
    if (!canSave) return
    setSaveState('saving')
    setMessage(null)
    try {
      const allocList = Object.entries(allocations)
        .map(([invoice_id, v]) => ({ invoice_id, amount: Number.parseFloat(v) || 0 }))
        .filter((a) => a.amount > 0.0005)

      await saveReceiptVoucher({
        voucherNo,
        paymentDate,
        method,
        channel,
        reference: reference || null,
        allocations: allocList,
      })

      // Refresh invoices to reflect new balances
      const refreshed = await getInvoicesWithBalances()
      setAllInvoices(refreshed)
      setSaveState('saved')
      setMessage(
        `Receipt ${voucherNo} saved. Allocated ${money(totalAllocated)} across ${selectedCount} invoice(s).`
      )
      setAllocations({})
      setReceivedAmount('')
      setReference('')
      // Prepare a fresh voucher number for the next receipt
      setTimeout(() => {
        setVoucherNo(genVoucherNo())
        setSaveState('idle')
      }, 3000)
    } catch (err) {
      console.error('[v0] Failed to save receipt voucher:', err)
      setSaveState('error')
      setMessage(err instanceof Error ? err.message : 'Failed to save receipt voucher.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading receipt data...
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left: selection + invoices */}
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Invoice(s)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Search and select one or more outstanding invoices for the customer to apply this
              receipt. Only unpaid or partially paid invoices are shown.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Customer</Label>
                <Select value={customerId} onValueChange={handleCustomerChange}>
                  <SelectTrigger aria-label="Select customer">
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.company ? ` — ${c.company}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sort by</Label>
                <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                  <SelectTrigger aria-label="Sort invoices">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice_date">Invoice Date (oldest first)</SelectItem>
                    <SelectItem value="due_date">Due Date</SelectItem>
                    <SelectItem value="invoice_no">Invoice Number</SelectItem>
                    <SelectItem value="outstanding">Outstanding Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {customerId && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Search invoices</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Invoice no, date, vehicle..."
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Min. outstanding</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={minOutstanding}
                    onChange={(e) => setMinOutstanding(e.target.value)}
                    placeholder="e.g. 50"
                  />
                </div>
              </div>
            )}

            {customerId && (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={autoAllocate}>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Auto-allocate to oldest
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSelection}>
                  <X className="mr-2 h-4 w-4" />
                  Clear selection
                </Button>
                <span className="ml-auto text-sm text-muted-foreground">
                  {visibleInvoices.length} outstanding invoice(s)
                </span>
              </div>
            )}

            {/* Invoice list */}
            {!customerId ? (
              <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
                Select a customer to view outstanding invoices.
              </div>
            ) : visibleInvoices.length === 0 ? (
              <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
                No outstanding invoices match your filters.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="w-10 px-3 py-2"></th>
                      <th className="px-3 py-2">Invoice</th>
                      <th className="px-3 py-2">Dates</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-right">Paid</th>
                      <th className="px-3 py-2 text-right">Outstanding</th>
                      <th className="px-3 py-2 text-right">Allocate</th>
                      <th className="w-16 px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {visibleInvoices.map((inv) => {
                      const alloc = allocations[inv.id] ?? ''
                      const isSelected = (Number.parseFloat(alloc) || 0) > 0.0005
                      return (
                        <tr
                          key={inv.id}
                          className={isSelected ? 'bg-primary/5' : undefined}
                        >
                          <td className="px-3 py-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(c) => toggleInvoice(inv, Boolean(c))}
                              aria-label={`Select invoice ${inv.invoice_no}`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-medium">{inv.invoice_no}</div>
                            <div className="text-xs text-muted-foreground">
                              {inv.rental_vehicle || inv.rental_reg_no || '—'}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <div>Inv: {inv.invoice_date || '—'}</div>
                            <div className="text-muted-foreground">
                              Due: {inv.due_date || '—'}
                            </div>
                            {inv.isOverdue && (
                              <Badge
                                variant="outline"
                                className="mt-1 border-red-300 bg-red-50 text-red-700"
                              >
                                {inv.daysOverdue}d overdue
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {money(inv.grand_total)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {money(inv.paid)}
                          </td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums text-red-600">
                            {money(inv.outstanding)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Input
                              type="number"
                              inputMode="decimal"
                              value={alloc}
                              onChange={(e) => setAllocation(inv, e.target.value)}
                              placeholder="0.000"
                              className="h-8 w-28 text-right"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => applyFull(inv)}
                            >
                              Full
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: receipt voucher summary */}
      <div className="space-y-6">
        <Card className="lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="h-4 w-4" />
              Receipt Voucher
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Voucher No.</Label>
                <Input value={voucherNo} onChange={(e) => setVoucherNo(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Channel</Label>
                  <Select value={channel} onValueChange={(v) => setChannel(v as 'Cash' | 'Bank')}>
                    <SelectTrigger aria-label="Payment channel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank">Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Method</Label>
                  <Input
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    placeholder="Cash, Card, Transfer"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Reference</Label>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Txn / cheque no."
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Received Amount</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  placeholder="0.000"
                  className="text-lg font-semibold"
                />
              </div>
            </div>

            <Separator />

            {/* Live totals */}
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Customer</dt>
                <dd className="font-medium">{selectedCustomer?.name || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Invoices selected</dt>
                <dd className="font-medium">{selectedCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Received</dt>
                <dd className="font-medium tabular-nums">{money(received)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Allocated</dt>
                <dd className="font-medium tabular-nums">{money(totalAllocated)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Unapplied</dt>
                <dd className="font-medium tabular-nums">{money(unapplied)}</dd>
              </div>
            </dl>

            {overAllocated && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Allocated amount exceeds the received amount. Reduce allocations or increase the
                received amount.
              </div>
            )}

            {message && (
              <div
                className={
                  saveState === 'error'
                    ? 'rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-700'
                    : 'rounded-md border border-green-300 bg-green-50 p-2 text-xs text-green-700'
                }
              >
                {message}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button onClick={handleSave} disabled={!canSave || saveState === 'saving'}>
                {saveState === 'saving' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : saveState === 'saved' ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <ReceiptText className="mr-2 h-4 w-4" />
                )}
                {saveState === 'saving'
                  ? 'Saving...'
                  : saveState === 'saved'
                    ? 'Saved'
                    : 'Save Receipt Voucher'}
              </Button>
              <Button variant="ghost" onClick={resetVoucher} disabled={saveState === 'saving'}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

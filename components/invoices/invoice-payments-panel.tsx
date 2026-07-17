'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Loader2, Wallet, ShieldCheck, Banknote } from 'lucide-react'
import {
  addInvoicePayment,
  addSecurityDeposit,
  deleteInvoicePayment,
  getDepositsForInvoice,
  getInvoicePayments,
  money,
  updateDepositRefund,
  type InvoicePayment,
  type SecurityDeposit,
} from '@/lib/accounting'
import { format } from 'date-fns'

interface Props {
  invoiceId: string
  grandTotal: number
  customerId?: string | null
  onChanged?: () => void
}

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Card', 'Cheque', 'Online']

export function InvoicePaymentsPanel({ invoiceId, grandTotal, customerId, onChanged }: Props) {
  const [payments, setPayments] = useState<InvoicePayment[]>([])
  const [deposits, setDeposits] = useState<SecurityDeposit[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pays, deps] = await Promise.all([
        getInvoicePayments(invoiceId),
        getDepositsForInvoice(invoiceId),
      ])
      setPayments(pays)
      setDeposits(deps)
    } catch (err) {
      console.error('[v0] Failed to load payments/deposits:', err)
    } finally {
      setLoading(false)
    }
  }, [invoiceId])

  useEffect(() => {
    load()
  }, [load])

  const paid = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0)
  const outstanding = Math.max(grandTotal - paid, 0)

  // ---- Record payment dialog ----
  const [payOpen, setPayOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [payForm, setPayForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    method: 'Cash',
    channel: 'Cash' as 'Cash' | 'Bank',
    reference: '',
    notes: '',
  })

  const resetPayForm = () =>
    setPayForm({
      payment_date: new Date().toISOString().split('T')[0],
      amount: '',
      method: 'Cash',
      channel: 'Cash',
      reference: '',
      notes: '',
    })

  const submitPayment = async () => {
    const amount = parseFloat(payForm.amount)
    if (isNaN(amount) || amount <= 0) return
    setSaving(true)
    try {
      await addInvoicePayment({
        invoice_id: invoiceId,
        payment_date: payForm.payment_date,
        amount,
        method: payForm.method,
        channel: payForm.channel,
        reference: payForm.reference || null,
        notes: payForm.notes || null,
      })
      setPayOpen(false)
      resetPayForm()
      await load()
      onChanged?.()
    } catch (err) {
      console.error('[v0] Failed to record payment:', err)
    } finally {
      setSaving(false)
    }
  }

  const removePayment = async (id: string) => {
    if (!confirm('Delete this payment?')) return
    try {
      await deleteInvoicePayment(id)
      await load()
      onChanged?.()
    } catch (err) {
      console.error('[v0] Failed to delete payment:', err)
    }
  }

  // ---- Deposit dialog ----
  const [depOpen, setDepOpen] = useState(false)
  const [depSaving, setDepSaving] = useState(false)
  const [depForm, setDepForm] = useState({
    amount: '',
    received_date: new Date().toISOString().split('T')[0],
    method: 'Cash',
    notes: '',
  })

  const submitDeposit = async () => {
    const amount = parseFloat(depForm.amount)
    if (isNaN(amount) || amount <= 0) return
    setDepSaving(true)
    try {
      await addSecurityDeposit({
        invoice_id: invoiceId,
        customer_id: customerId ?? null,
        amount,
        received_date: depForm.received_date,
        method: depForm.method || null,
        notes: depForm.notes || null,
      })
      setDepOpen(false)
      setDepForm({
        amount: '',
        received_date: new Date().toISOString().split('T')[0],
        method: 'Cash',
        notes: '',
      })
      await load()
    } catch (err) {
      console.error('[v0] Failed to add deposit:', err)
    } finally {
      setDepSaving(false)
    }
  }

  const refundDeposit = async (dep: SecurityDeposit) => {
    const input = prompt(
      `Refund amount for this deposit (held: ${money(dep.amount)}):`,
      String(dep.amount)
    )
    if (input == null) return
    const refunded = parseFloat(input)
    if (isNaN(refunded) || refunded < 0) return
    const status: SecurityDeposit['status'] =
      refunded >= dep.amount ? 'refunded' : refunded <= 0 ? 'held' : 'partial'
    try {
      await updateDepositRefund(dep.id, {
        status,
        refunded_amount: refunded,
        refund_date: new Date().toISOString().split('T')[0],
      })
      await load()
    } catch (err) {
      console.error('[v0] Failed to refund deposit:', err)
    }
  }

  const depositStatusBadge = (s: SecurityDeposit['status']) => {
    const map: Record<SecurityDeposit['status'], string> = {
      held: 'bg-blue-100 text-blue-700',
      refunded: 'bg-green-100 text-green-700',
      forfeited: 'bg-red-100 text-red-700',
      partial: 'bg-amber-100 text-amber-700',
    }
    return <Badge className={`${map[s]} hover:${map[s]} capitalize`}>{s}</Badge>
  }

  return (
    <div className="max-w-4xl mx-auto print:hidden space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Invoice Total</p>
            <p className="text-lg font-semibold">{money(grandTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="text-lg font-semibold text-green-700">{money(paid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className={`text-lg font-semibold ${outstanding > 0 ? 'text-red-600' : 'text-green-700'}`}>
              {money(outstanding)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment history */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-blue-700" />
            Payment History
          </CardTitle>
          <Dialog open={payOpen} onOpenChange={setPayOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="pay-date">Payment Date</Label>
                    <Input
                      id="pay-date"
                      type="date"
                      value={payForm.payment_date}
                      onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pay-amount">Amount (OMR)</Label>
                    <Input
                      id="pay-amount"
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      value={payForm.amount}
                      onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Method</Label>
                    <Select
                      value={payForm.method}
                      onValueChange={(v) =>
                        setPayForm({
                          ...payForm,
                          method: v,
                          channel: v === 'Cash' ? 'Cash' : 'Bank',
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Channel</Label>
                    <Select
                      value={payForm.channel}
                      onValueChange={(v) => setPayForm({ ...payForm, channel: v as 'Cash' | 'Bank' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Bank">Bank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pay-ref">Reference</Label>
                  <Input
                    id="pay-ref"
                    placeholder="Transaction / cheque no."
                    value={payForm.reference}
                    onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pay-notes">Notes</Label>
                  <Input
                    id="pay-notes"
                    placeholder="Optional"
                    value={payForm.notes}
                    onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Outstanding after this payment:{' '}
                  <span className="font-medium">
                    {money(Math.max(outstanding - (parseFloat(payForm.amount) || 0), 0))}
                  </span>
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPayOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={submitPayment} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Payment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Loading...
            </div>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No payments recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{format(new Date(p.payment_date), 'dd-MMM-yy')}</TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        {p.channel === 'Bank' ? (
                          <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        {p.channel}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.reference || '-'}</TableCell>
                    <TableCell className="text-right font-medium">{money(p.amount)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removePayment(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Security deposits */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-700" />
            Security Deposits
          </CardTitle>
          <Dialog open={depOpen} onOpenChange={setDepOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Deposit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Security Deposit</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="dep-amount">Amount (OMR)</Label>
                    <Input
                      id="dep-amount"
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      value={depForm.amount}
                      onChange={(e) => setDepForm({ ...depForm, amount: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dep-date">Received Date</Label>
                    <Input
                      id="dep-date"
                      type="date"
                      value={depForm.received_date}
                      onChange={(e) => setDepForm({ ...depForm, received_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dep-method">Method</Label>
                  <Input
                    id="dep-method"
                    placeholder="Cash / Card hold / Bank"
                    value={depForm.method}
                    onChange={(e) => setDepForm({ ...depForm, method: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dep-notes">Notes</Label>
                  <Input
                    id="dep-notes"
                    placeholder="Optional"
                    value={depForm.notes}
                    onChange={(e) => setDepForm({ ...depForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDepOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={submitDeposit} disabled={depSaving}>
                  {depSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Deposit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Loading...
            </div>
          ) : deposits.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No security deposits recorded.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Received</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Refunded</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deposits.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{format(new Date(d.received_date), 'dd-MMM-yy')}</TableCell>
                    <TableCell>{d.method || '-'}</TableCell>
                    <TableCell className="text-right font-medium">{money(d.amount)}</TableCell>
                    <TableCell className="text-right">
                      {d.refunded_amount > 0 ? money(d.refunded_amount) : '-'}
                    </TableCell>
                    <TableCell>{depositStatusBadge(d.status)}</TableCell>
                    <TableCell className="text-right">
                      {d.status !== 'refunded' && (
                        <Button variant="outline" size="sm" onClick={() => refundDeposit(d)}>
                          Refund
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

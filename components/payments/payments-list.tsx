'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Plus, 
  Search, 
  Receipt, 
  Printer,
  Eye,
  CreditCard,
  Banknote,
  Building2,
  Wallet,
  Globe,
  ArrowLeft,
  RefreshCw,
  Pencil,
  Trash2
} from 'lucide-react'
import { format } from 'date-fns'
import type { Payment, PaymentMode } from '@/lib/types'

const paymentModeIcons: Record<PaymentMode, React.ReactNode> = {
  cash: <Banknote className="h-4 w-4" />,
  cheque: <Receipt className="h-4 w-4" />,
  bank_transfer: <Building2 className="h-4 w-4" />,
  card: <CreditCard className="h-4 w-4" />,
  online: <Globe className="h-4 w-4" />,
}

const paymentModeLabels: Record<PaymentMode, string> = {
  cash: 'Cash',
  cheque: 'Cheque',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  online: 'Online',
}

export function PaymentsList() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>('all')
  const [showCreatedAlert, setShowCreatedAlert] = useState(false)
  const [showUpdatedAlert, setShowUpdatedAlert] = useState(false)
  const [createdReceiptNo, setCreatedReceiptNo] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const created = searchParams.get('created')
    const updated = searchParams.get('updated')
    if (created) {
      setShowCreatedAlert(true)
      setCreatedReceiptNo(created)
      setTimeout(() => setShowCreatedAlert(false), 5000)
    }
    if (updated) {
      setShowUpdatedAlert(true)
      setCreatedReceiptNo(updated)
      setTimeout(() => setShowUpdatedAlert(false), 5000)
    }
  }, [searchParams])

  const fetchPayments = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('payments')
      .select('*, vehicle:vehicles(*)')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching payments:', error)
    } else {
      setPayments(data || [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  const handleDelete = async (payment: Payment) => {
    if (!confirm(`Are you sure you want to delete receipt #${payment.receipt_no}?\n\nThis action cannot be undone.`)) {
      return
    }
    
    setDeletingId(payment.id)
    try {
      // Delete payment items first
      await supabase
        .from('payment_items')
        .delete()
        .eq('payment_id', payment.id)
      
      // Delete payment
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', payment.id)
      
      if (error) throw error
      
      // Refresh list
      fetchPayments()
    } catch (error) {
      console.error('Error deleting payment:', error)
      alert('Failed to delete payment. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = 
      payment.receipt_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (payment.agreement_no && payment.agreement_no.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesMode = paymentModeFilter === 'all' || payment.payment_mode === paymentModeFilter

    return matchesSearch && matchesMode
  })

  const totalAmount = filteredPayments.reduce((sum, p) => sum + Number(p.total_amount), 0)

  return (
    <div className="space-y-6">
      {/* Success Alert - Created */}
      {showCreatedAlert && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>Payment receipt #{createdReceiptNo} created successfully!</span>
          <Link href={`/receipt?receiptNo=${createdReceiptNo}`}>
            <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-300">
              <Printer className="h-4 w-4 mr-1" />
              Print Receipt
            </Button>
          </Link>
        </div>
      )}

      {/* Success Alert - Updated */}
      {showUpdatedAlert && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>Payment receipt #{createdReceiptNo} updated successfully!</span>
          <Link href={`/receipt?receiptNo=${createdReceiptNo}`}>
            <Button size="sm" variant="outline" className="text-blue-700 border-blue-300">
              <Printer className="h-4 w-4 mr-1" />
              Print Receipt
            </Button>
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Payments</h1>
            <p className="text-muted-foreground">Manage payment receipts</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPayments} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/payments/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Payment
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              OMR {totalAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Filtered results</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cash Payments</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments.filter(p => p.payment_mode === 'cash').length}
            </div>
            <p className="text-xs text-muted-foreground">
              OMR {payments.filter(p => p.payment_mode === 'cash').reduce((sum, p) => sum + Number(p.total_amount), 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by receipt no, customer, or agreement..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={paymentModeFilter} onValueChange={setPaymentModeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Payment Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Agreement</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading payments...
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No payments found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono font-medium">
                      #{payment.receipt_no}
                    </TableCell>
                    <TableCell>
                      {format(new Date(payment.receipt_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payment.customer_name}</p>
                        {payment.customer_phone && (
                          <p className="text-xs text-muted-foreground">{payment.customer_phone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {paymentModeIcons[payment.payment_mode]}
                        {paymentModeLabels[payment.payment_mode]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payment.agreement_no || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {payment.currency} {Number(payment.total_amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/receipt?receiptNo=${payment.receipt_no}`}>
                          <Button size="sm" variant="ghost" title="View Receipt">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/receipt?receiptNo=${payment.receipt_no}&print=true`}>
                          <Button size="sm" variant="ghost" title="Print Receipt">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/payments/edit/${payment.id}`}>
                          <Button size="sm" variant="ghost" title="Edit Payment">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          title="Delete Payment"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(payment)}
                          disabled={deletingId === payment.id}
                        >
                          <Trash2 className={`h-4 w-4 ${deletingId === payment.id ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

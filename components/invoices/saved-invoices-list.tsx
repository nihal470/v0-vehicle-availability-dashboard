'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
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
  Search,
  Eye,
  Plus,
  RefreshCw,
  Trash2,
  FileText,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'

interface InvoiceRecord {
  id: string
  invoice_no: string
  reservation_no: string | null
  invoice_date: string | null
  payment_status: 'Paid' | 'Pending'
  customer_name: string | null
  rental_vehicle: string | null
  grand_total: number
  balance_due: number
  created_at: string
}

export function SavedInvoicesList() {
  const supabase = createClient()
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchInvoices = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(
          'id, invoice_no, reservation_no, invoice_date, payment_status, customer_name, rental_vehicle, grand_total, balance_due, created_at'
        )
        .order('created_at', { ascending: false })
      if (error) throw error
      setInvoices((data as InvoiceRecord[]) ?? [])
    } catch (err) {
      console.error('[v0] Failed to fetch invoices:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this invoice? This cannot be undone.')) return
    setDeletingId(id)
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id)
      if (error) throw error
      setInvoices((prev) => prev.filter((inv) => inv.id !== id))
    } catch (err) {
      console.error('[v0] Failed to delete invoice:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return invoices
    return invoices.filter(
      (inv) =>
        inv.invoice_no?.toLowerCase().includes(q) ||
        inv.customer_name?.toLowerCase().includes(q) ||
        inv.reservation_no?.toLowerCase().includes(q) ||
        inv.rental_vehicle?.toLowerCase().includes(q)
    )
  }, [invoices, searchQuery])

  const money = (n: number) => `OMR ${(n ?? 0).toFixed(3)}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-700" />
            Saved Invoices
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {invoices.length} invoice{invoices.length === 1 ? '' : 's'} saved
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchInvoices} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild size="sm">
            <Link href="/invoice">
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Link>
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by invoice no, customer, vehicle..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Loading invoices...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No invoices match your search.' : 'No saved invoices yet.'}
              </p>
              {!searchQuery && (
                <Button asChild size="sm" className="mt-4">
                  <Link href="/invoice">
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first invoice
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoice_no}</TableCell>
                    <TableCell>
                      {inv.invoice_date
                        ? format(new Date(inv.invoice_date), 'dd-MMM-yy')
                        : format(new Date(inv.created_at), 'dd-MMM-yy')}
                    </TableCell>
                    <TableCell>{inv.customer_name || '-'}</TableCell>
                    <TableCell>{inv.rental_vehicle || '-'}</TableCell>
                    <TableCell className="text-right">{money(inv.grand_total)}</TableCell>
                    <TableCell className="text-right">
                      <span className={inv.balance_due > 0 ? 'text-red-600 font-medium' : ''}>
                        {money(inv.balance_due)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={inv.payment_status === 'Paid' ? 'default' : 'secondary'}
                        className={
                          inv.payment_status === 'Paid'
                            ? 'bg-green-100 text-green-700 hover:bg-green-100'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                        }
                      >
                        {inv.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="sm" title="View / Edit">
                          <Link href={`/invoice?id=${inv.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(inv.id)}
                          disabled={deletingId === inv.id}
                          title="Delete"
                        >
                          {deletingId === inv.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
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

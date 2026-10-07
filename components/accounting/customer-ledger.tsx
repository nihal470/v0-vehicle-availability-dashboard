'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createClient } from '@/lib/supabase/client'
import {
  getCustomerLedger,
  money,
  type Customer,
  type LedgerEntry,
} from '@/lib/accounting'
import {
  Loader2,
  ArrowLeft,
  Printer,
  Mail,
  Phone,
  Building2,
  FileText,
  Wallet,
} from 'lucide-react'
import { format } from 'date-fns'

interface Props {
  customerId: string
}

export function CustomerLedger({ customerId }: Props) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [totals, setTotals] = useState({ totalDebit: 0, totalCredit: 0, outstanding: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient()
        const [{ data: cust }, ledger] = await Promise.all([
          supabase.from('customers').select('*').eq('id', customerId).single(),
          getCustomerLedger(customerId),
        ])
        setCustomer((cust as Customer) ?? null)
        setEntries(ledger.entries)
        setTotals({
          totalDebit: ledger.totalDebit,
          totalCredit: ledger.totalCredit,
          outstanding: ledger.outstanding,
        })
      } catch (err) {
        console.error('[v0] Failed to load ledger:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [customerId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 mr-2 animate-spin" />
        Loading ledger...
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">Customer not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/customers">Back to Customers</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link href="/customers">
            <ArrowLeft className="h-4 w-4 mr-2" />
            All Customers
          </Link>
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />
          Print Statement
        </Button>
      </div>

      {/* Customer header */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">{customer.name}</h2>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {customer.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {customer.company}
                </span>
              )}
              {customer.mobile && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {customer.mobile}
                </span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {customer.email}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                <FileText className="h-3.5 w-3.5" /> Total Debit
              </p>
              <p className="text-lg font-semibold tabular-nums">{money(totals.totalDebit)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                <Wallet className="h-3.5 w-3.5" /> Total Credit
              </p>
              <p className="text-lg font-semibold tabular-nums text-green-700">
                {money(totals.totalCredit)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground justify-end">Outstanding</p>
              <p
                className={`text-lg font-semibold tabular-nums ${
                  totals.outstanding > 0.0005 ? 'text-red-600' : 'text-green-700'
                }`}
              >
                {money(totals.outstanding)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ledger table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Customer Ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invoice No</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Running Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell>{e.date ? format(new Date(e.date), 'dd-MMM-yy') : '-'}</TableCell>
                  <TableCell className="font-medium">{e.reference}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={
                          e.type === 'invoice'
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                            : 'bg-green-100 text-green-700 hover:bg-green-100'
                        }
                      >
                        {e.type === 'invoice' ? 'Invoice' : 'Payment'}
                      </Badge>
                      <span className="text-muted-foreground">{e.description}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {e.debit > 0 ? money(e.debit) : '-'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-green-700">
                    {e.credit > 0 ? money(e.credit) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {money(e.runningBalance)}
                  </TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No ledger entries for this customer yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {entries.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="font-semibold">
                    Totals
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {money(totals.totalDebit)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-green-700">
                    {money(totals.totalCredit)}
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">
                    {money(totals.outstanding)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

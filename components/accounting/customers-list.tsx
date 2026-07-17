'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  getCustomers,
  getInvoicesWithBalances,
  money,
  type Customer,
  type InvoiceWithBalance,
} from '@/lib/accounting'
import { Loader2, Search, Users, ChevronRight } from 'lucide-react'

interface CustomerRow extends Customer {
  invoiceCount: number
  totalInvoiced: number
  outstanding: number
}

export function CustomersList() {
  const [rows, setRows] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([getCustomers(), getInvoicesWithBalances()])
      .then(([customers, invoices]) => {
        const byCustomer = new Map<string, InvoiceWithBalance[]>()
        for (const inv of invoices) {
          if (!inv.customer_id) continue
          const list = byCustomer.get(inv.customer_id) ?? []
          list.push(inv)
          byCustomer.set(inv.customer_id, list)
        }
        setRows(
          customers.map((c) => {
            const invs = byCustomer.get(c.id) ?? []
            return {
              ...c,
              invoiceCount: invs.length,
              totalInvoiced: invs.reduce((s, i) => s + Number(i.grand_total ?? 0), 0),
              outstanding: invs.reduce((s, i) => s + i.outstanding, 0),
            }
          })
        )
      })
      .catch((err) => console.error('[v0] Failed to load customers:', err))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.company ?? '').toLowerCase().includes(q) ||
        (r.mobile ?? '').toLowerCase().includes(q)
    )
  }, [rows, search])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 mr-2 animate-spin" />
        Loading customers...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, company, mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {search ? 'No customers match your search.' : 'No customers yet. Create an invoice to add one.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Total Invoiced</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="w-24 text-right">Ledger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.company || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{c.mobile || '-'}</TableCell>
                    <TableCell className="text-right">{c.invoiceCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(c.totalInvoiced)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={c.outstanding > 0.0005 ? 'text-red-600 font-medium' : ''}>
                        {money(c.outstanding)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/customers/${c.id}`}>
                          View <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
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

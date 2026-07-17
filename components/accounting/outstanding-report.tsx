'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AGEING_BUCKETS,
  buildAgeingSummary,
  getCustomers,
  getInvoicesWithBalances,
  groupOutstandingByCompany,
  groupOutstandingByCustomer,
  money,
  type AgeingBucket,
  type Customer,
  type InvoiceWithBalance,
  type OutstandingGroup,
} from '@/lib/accounting'
import {
  AlertTriangle,
  Loader2,
  Search,
  TrendingDown,
  Clock,
  Eye,
} from 'lucide-react'
import { format } from 'date-fns'

const BUCKET_STYLES: Record<AgeingBucket, string> = {
  Current: 'bg-emerald-100 text-emerald-700',
  '1-30 Days': 'bg-blue-100 text-blue-700',
  '31-60 Days': 'bg-amber-100 text-amber-700',
  '61-90 Days': 'bg-orange-100 text-orange-700',
  'Over 90 Days': 'bg-red-100 text-red-700',
}

export function OutstandingReport() {
  const [invoices, setInvoices] = useState<InvoiceWithBalance[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([getInvoicesWithBalances(), getCustomers()])
      .then(([inv, cust]) => {
        setInvoices(inv)
        setCustomers(cust)
      })
      .catch((err) => console.error('[v0] Failed to load outstanding data:', err))
      .finally(() => setLoading(false))
  }, [])

  const outstandingInvoices = useMemo(
    () => invoices.filter((i) => i.outstanding > 0.0005),
    [invoices]
  )

  const ageing = useMemo(() => buildAgeingSummary(invoices), [invoices])
  const byCustomer = useMemo(() => groupOutstandingByCustomer(invoices), [invoices])
  const byCompany = useMemo(
    () => groupOutstandingByCompany(invoices, customers),
    [invoices, customers]
  )
  const overdue = useMemo(
    () => outstandingInvoices.filter((i) => i.isOverdue).sort((a, b) => b.daysOverdue - a.daysOverdue),
    [outstandingInvoices]
  )

  const totalOutstanding = ageing.total
  const overdueTotal = overdue.reduce((s, i) => s + i.outstanding, 0)

  const filterGroups = (groups: OutstandingGroup[]) => {
    const q = search.trim().toLowerCase()
    if (!q) return groups
    return groups.filter((g) => g.label.toLowerCase().includes(q))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 mr-2 animate-spin" />
        Loading outstanding report...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Outstanding"
          value={money(totalOutstanding)}
          icon={<TrendingDown className="h-5 w-5" />}
          tone="text-red-600"
        />
        <SummaryCard
          label="Overdue Amount"
          value={money(overdueTotal)}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="text-orange-600"
        />
        <SummaryCard
          label="Open Invoices"
          value={String(outstandingInvoices.length)}
          icon={<Clock className="h-5 w-5" />}
          tone="text-blue-600"
        />
        <SummaryCard
          label="Overdue Invoices"
          value={String(overdue.length)}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="text-amber-600"
        />
      </div>

      {/* Ageing summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ageing Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {AGEING_BUCKETS.map((bucket) => {
              const amount = ageing.buckets[bucket]
              const pct = totalOutstanding > 0 ? (amount / totalOutstanding) * 100 : 0
              return (
                <div key={bucket} className="rounded-lg border p-4">
                  <Badge className={`${BUCKET_STYLES[bucket]} hover:${BUCKET_STYLES[bucket]} mb-2`}>
                    {bucket}
                  </Badge>
                  <p className="text-lg font-semibold tabular-nums">{money(amount)}</p>
                  <p className="text-xs text-muted-foreground">{pct.toFixed(1)}% of total</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detail tabs */}
      <Tabs defaultValue="customer">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="customer">Customer-wise</TabsTrigger>
            <TabsTrigger value="company">Company-wise</TabsTrigger>
            <TabsTrigger value="invoices">All Invoices</TabsTrigger>
            <TabsTrigger value="overdue">Overdue Reminders</TabsTrigger>
          </TabsList>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <TabsContent value="customer" className="mt-4">
          <GroupTable groups={filterGroups(byCustomer)} showSub />
        </TabsContent>

        <TabsContent value="company" className="mt-4">
          <GroupTable groups={filterGroups(byCompany)} />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Ageing</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outstandingInvoices
                    .filter((i) =>
                      search.trim()
                        ? (i.customer_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
                          i.invoice_no.toLowerCase().includes(search.toLowerCase())
                        : true
                    )
                    .map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invoice_no}</TableCell>
                        <TableCell>{inv.customer_name || '-'}</TableCell>
                        <TableCell>
                          {inv.due_date
                            ? format(new Date(inv.due_date), 'dd-MMM-yy')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${BUCKET_STYLES[inv.ageingBucket]} hover:${BUCKET_STYLES[inv.ageingBucket]}`}>
                            {inv.ageingBucket}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{money(inv.grand_total)}</TableCell>
                        <TableCell className="text-right tabular-nums text-green-700">{money(inv.paid)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-red-600">
                          {money(inv.outstanding)}
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/invoice?id=${inv.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  {outstandingInvoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        No outstanding invoices. Everything is settled.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Days Overdue</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdue.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoice_no}</TableCell>
                      <TableCell>{inv.customer_name || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{inv.customer_mobile || '-'}</TableCell>
                      <TableCell>
                        {inv.due_date ? format(new Date(inv.due_date), 'dd-MMM-yy') : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1 font-medium text-red-600">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {inv.daysOverdue}d
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-red-600">
                        {money(inv.outstanding)}
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/invoice?id=${inv.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {overdue.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        No overdue invoices.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: string
  icon: React.ReactNode
  tone: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
        </div>
        <span className={`rounded-full bg-muted p-2 ${tone}`}>{icon}</span>
      </CardContent>
    </Card>
  )
}

function GroupTable({ groups, showSub }: { groups: OutstandingGroup[]; showSub?: boolean }) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{showSub ? 'Customer' : 'Company'}</TableHead>
              <TableHead className="text-right">Invoices</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">1-30</TableHead>
              <TableHead className="text-right">31-60</TableHead>
              <TableHead className="text-right">61-90</TableHead>
              <TableHead className="text-right">90+</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((g) => (
              <TableRow key={g.key}>
                <TableCell>
                  <div className="font-medium">{g.label}</div>
                  {showSub && g.sublabel && (
                    <div className="text-xs text-muted-foreground">{g.sublabel}</div>
                  )}
                  {g.overdueCount > 0 && (
                    <span className="text-xs text-red-600">{g.overdueCount} overdue</span>
                  )}
                </TableCell>
                <TableCell className="text-right">{g.invoiceCount}</TableCell>
                <TableCell className="text-right tabular-nums">{money(g.buckets.Current)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(g.buckets['1-30 Days'])}</TableCell>
                <TableCell className="text-right tabular-nums">{money(g.buckets['31-60 Days'])}</TableCell>
                <TableCell className="text-right tabular-nums">{money(g.buckets['61-90 Days'])}</TableCell>
                <TableCell className="text-right tabular-nums text-red-600">
                  {money(g.buckets['Over 90 Days'])}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {money(g.outstanding)}
                </TableCell>
              </TableRow>
            ))}
            {groups.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  No outstanding balances.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

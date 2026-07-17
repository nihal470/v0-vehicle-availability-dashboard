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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  getDashboardMetrics,
  money,
  type DashboardMetrics,
} from '@/lib/accounting'
import {
  Users,
  FileText,
  DollarSign,
  Receipt,
  Wallet,
  TrendingUp,
  Landmark,
  Banknote,
  CalendarDays,
  AlertTriangle,
  Loader2,
  Eye,
} from 'lucide-react'
import { format } from 'date-fns'

const revenueConfig: ChartConfig = {
  revenue: { label: 'Revenue', color: 'var(--chart-1)' },
}

export function AccountingDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardMetrics()
      .then(setMetrics)
      .catch((err) => console.error('[v0] Failed to load dashboard:', err))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 mr-2 animate-spin" />
        Loading dashboard...
      </div>
    )
  }

  const cashTotal = metrics.cashCollection + metrics.bankCollection || 1
  const cashPct = (metrics.cashCollection / cashTotal) * 100
  const bankPct = (metrics.bankCollection / cashTotal) * 100

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total Customers" value={String(metrics.totalCustomers)} icon={<Users className="h-5 w-5" />} />
        <Kpi label="Total Invoices" value={String(metrics.totalInvoices)} icon={<FileText className="h-5 w-5" />} />
        <Kpi label="Total Sales" value={money(metrics.totalSales)} icon={<DollarSign className="h-5 w-5" />} />
        <Kpi label="VAT Collected" value={money(metrics.totalVat)} icon={<Receipt className="h-5 w-5" />} />
        <Kpi label="Payments Received" value={money(metrics.paymentsReceived)} icon={<Wallet className="h-5 w-5" />} tone="text-green-700" />
        <Kpi label="Outstanding" value={money(metrics.outstandingReceivables)} icon={<TrendingUp className="h-5 w-5" />} tone="text-red-600" />
        <Kpi label="Daily Collection" value={money(metrics.dailyCollection)} icon={<CalendarDays className="h-5 w-5" />} />
        <Kpi label="Overdue Invoices" value={String(metrics.overdueInvoices.length)} icon={<AlertTriangle className="h-5 w-5" />} tone="text-amber-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Monthly revenue chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueConfig} className="h-64 w-full">
              <BarChart data={metrics.monthlyRevenue} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={70} tickFormatter={(v) => `${v}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Cash vs Bank */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cash vs Bank Collection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-emerald-600" /> Cash
                </span>
                <span className="font-medium tabular-nums">{money(metrics.cashCollection)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${cashPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-blue-600" /> Bank
                </span>
                <span className="font-medium tabular-nums">{money(metrics.bankCollection)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${bankPct}%` }} />
              </div>
            </div>
            <div className="border-t pt-3 text-sm flex items-center justify-between">
              <span className="text-muted-foreground">Total Collected</span>
              <span className="font-semibold tabular-nums">
                {money(metrics.cashCollection + metrics.bankCollection)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top customers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Customers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Total Invoiced</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.topCustomers.map((c) => (
                  <TableRow key={c.name}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(c.total)}</TableCell>
                  </TableRow>
                ))}
                {metrics.topCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                      No data yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent payments */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.recentPayments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.date ? format(new Date(p.date), 'dd-MMM-yy') : '-'}</TableCell>
                    <TableCell>{p.customer}</TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell className="text-right tabular-nums text-green-700">{money(p.amount)}</TableCell>
                  </TableRow>
                ))}
                {metrics.recentPayments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No payments yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Overdue invoices */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Overdue Invoices
          </CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/outstanding">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Days Overdue</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.overdueInvoices.slice(0, 8).map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoice_no}</TableCell>
                  <TableCell>{inv.customer_name || '-'}</TableCell>
                  <TableCell>{inv.due_date ? format(new Date(inv.due_date), 'dd-MMM-yy') : '-'}</TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{inv.daysOverdue}d</Badge>
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
              {metrics.overdueInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No overdue invoices.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function Kpi({
  label,
  value,
  icon,
  tone = 'text-foreground',
}: {
  label: string
  value: string
  icon: React.ReactNode
  tone?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
        </div>
        <span className="rounded-full bg-muted p-2 text-muted-foreground">{icon}</span>
      </CardContent>
    </Card>
  )
}

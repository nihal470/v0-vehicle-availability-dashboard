import { createClient } from '@/lib/supabase/client'

// ============================================================
// Types
// ============================================================

export interface Customer {
  id: string
  name: string
  company: string | null
  mobile: string | null
  email: string | null
  passport: string | null
  nationality: string | null
  licence: string | null
  address: string | null
  created_at: string
  updated_at: string
}

export interface InvoicePayment {
  id: string
  invoice_id: string
  payment_date: string
  amount: number
  method: string
  channel: 'Cash' | 'Bank'
  reference: string | null
  notes: string | null
  created_at: string
}

export interface SecurityDeposit {
  id: string
  invoice_id: string | null
  customer_id: string | null
  amount: number
  received_date: string
  status: 'held' | 'refunded' | 'forfeited' | 'partial'
  refunded_amount: number
  refund_date: string | null
  method: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceRow {
  id: string
  invoice_no: string
  reservation_no: string | null
  invoice_date: string | null
  due_date: string | null
  payment_status: string
  status: string
  customer_id: string | null
  customer_name: string | null
  customer_mobile: string | null
  rental_vehicle: string | null
  rental_reg_no: string | null
  subtotal: number
  vat_amount: number
  grand_total: number
  amount_paid: number
  deposit_amount: number
  created_at: string
}

/** Invoice enriched with live paid/outstanding figures computed from invoice_payments. */
export interface InvoiceWithBalance extends InvoiceRow {
  paid: number
  outstanding: number
  isOverdue: boolean
  daysOverdue: number
  ageingBucket: AgeingBucket
}

export type AgeingBucket =
  | 'Current'
  | '1-30 Days'
  | '31-60 Days'
  | '61-90 Days'
  | 'Over 90 Days'

export const AGEING_BUCKETS: AgeingBucket[] = [
  'Current',
  '1-30 Days',
  '31-60 Days',
  '61-90 Days',
  'Over 90 Days',
]

// ============================================================
// Helpers
// ============================================================

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

/** Determine ageing bucket from the reference date (due date, else invoice date). */
export function bucketForDays(days: number): AgeingBucket {
  if (days <= 0) return 'Current'
  if (days <= 30) return '1-30 Days'
  if (days <= 60) return '31-60 Days'
  if (days <= 90) return '61-90 Days'
  return 'Over 90 Days'
}

export function money(n: number): string {
  return `OMR ${(n ?? 0).toFixed(3)}`
}

// ============================================================
// Core fetch: invoices with live balances
// ============================================================

/**
 * Fetch all invoices joined with the sum of their recorded payments so we can
 * compute outstanding balances and ageing entirely from source data.
 */
export async function getInvoicesWithBalances(): Promise<InvoiceWithBalance[]> {
  const supabase = createClient()

  const [invoicesRes, paymentsRes] = await Promise.all([
    supabase
      .from('invoices')
      .select(
        'id, invoice_no, reservation_no, invoice_date, due_date, payment_status, status, customer_id, customer_name, customer_mobile, rental_vehicle, rental_reg_no, subtotal, vat_amount, grand_total, amount_paid, deposit_amount, created_at'
      )
      .order('invoice_date', { ascending: false }),
    supabase.from('invoice_payments').select('invoice_id, amount'),
  ])

  if (invoicesRes.error) throw invoicesRes.error
  if (paymentsRes.error) throw paymentsRes.error

  const paidByInvoice = new Map<string, number>()
  for (const p of paymentsRes.data ?? []) {
    paidByInvoice.set(
      p.invoice_id as string,
      (paidByInvoice.get(p.invoice_id as string) ?? 0) + Number(p.amount ?? 0)
    )
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (invoicesRes.data ?? []).map((inv) => {
    const row = inv as InvoiceRow
    const paid = paidByInvoice.get(row.id) ?? 0
    const outstanding = Math.max(Number(row.grand_total ?? 0) - paid, 0)

    const refDateStr = row.due_date || row.invoice_date || row.created_at
    const refDate = refDateStr ? new Date(refDateStr) : today
    refDate.setHours(0, 0, 0, 0)
    const days = daysBetween(refDate, today)
    const isOverdue = outstanding > 0.0005 && days > 0
    const ageingBucket = outstanding > 0.0005 ? bucketForDays(days) : 'Current'

    return {
      ...row,
      paid,
      outstanding,
      isOverdue,
      daysOverdue: isOverdue ? days : 0,
      ageingBucket,
    }
  })
}

// ============================================================
// Ageing report
// ============================================================

export interface AgeingSummary {
  buckets: Record<AgeingBucket, number>
  total: number
}

export function buildAgeingSummary(invoices: InvoiceWithBalance[]): AgeingSummary {
  const buckets: Record<AgeingBucket, number> = {
    Current: 0,
    '1-30 Days': 0,
    '31-60 Days': 0,
    '61-90 Days': 0,
    'Over 90 Days': 0,
  }
  let total = 0
  for (const inv of invoices) {
    if (inv.outstanding <= 0.0005) continue
    buckets[inv.ageingBucket] += inv.outstanding
    total += inv.outstanding
  }
  return { buckets, total }
}

// ============================================================
// Customer / company-wise outstanding
// ============================================================

export interface OutstandingGroup {
  key: string
  label: string
  sublabel?: string
  outstanding: number
  invoiceCount: number
  overdueCount: number
  buckets: Record<AgeingBucket, number>
}

function emptyBuckets(): Record<AgeingBucket, number> {
  return {
    Current: 0,
    '1-30 Days': 0,
    '31-60 Days': 0,
    '61-90 Days': 0,
    'Over 90 Days': 0,
  }
}

export function groupOutstandingByCustomer(
  invoices: InvoiceWithBalance[]
): OutstandingGroup[] {
  const map = new Map<string, OutstandingGroup>()
  for (const inv of invoices) {
    if (inv.outstanding <= 0.0005) continue
    const key = inv.customer_id || inv.customer_name || 'Unknown'
    const label = inv.customer_name || 'Unknown Customer'
    if (!map.has(key)) {
      map.set(key, {
        key,
        label,
        sublabel: inv.customer_mobile || undefined,
        outstanding: 0,
        invoiceCount: 0,
        overdueCount: 0,
        buckets: emptyBuckets(),
      })
    }
    const g = map.get(key)!
    g.outstanding += inv.outstanding
    g.invoiceCount += 1
    if (inv.isOverdue) g.overdueCount += 1
    g.buckets[inv.ageingBucket] += inv.outstanding
  }
  return Array.from(map.values()).sort((a, b) => b.outstanding - a.outstanding)
}

export function groupOutstandingByCompany(
  invoices: InvoiceWithBalance[],
  customers: Customer[]
): OutstandingGroup[] {
  const companyByCustomerId = new Map<string, string>()
  for (const c of customers) {
    if (c.company) companyByCustomerId.set(c.id, c.company)
  }

  const map = new Map<string, OutstandingGroup>()
  for (const inv of invoices) {
    if (inv.outstanding <= 0.0005) continue
    const company =
      (inv.customer_id && companyByCustomerId.get(inv.customer_id)) || 'No Company'
    if (!map.has(company)) {
      map.set(company, {
        key: company,
        label: company,
        outstanding: 0,
        invoiceCount: 0,
        overdueCount: 0,
        buckets: emptyBuckets(),
      })
    }
    const g = map.get(company)!
    g.outstanding += inv.outstanding
    g.invoiceCount += 1
    if (inv.isOverdue) g.overdueCount += 1
    g.buckets[inv.ageingBucket] += inv.outstanding
  }
  return Array.from(map.values()).sort((a, b) => b.outstanding - a.outstanding)
}

// ============================================================
// Customer ledger
// ============================================================

export interface LedgerEntry {
  date: string
  type: 'invoice' | 'payment'
  reference: string
  description: string
  debit: number
  credit: number
  runningBalance: number
}

/**
 * Build a running-balance ledger for a customer: invoices are debits,
 * payments are credits, ordered chronologically.
 */
export async function getCustomerLedger(customerId: string): Promise<{
  entries: LedgerEntry[]
  totalDebit: number
  totalCredit: number
  outstanding: number
}> {
  const supabase = createClient()

  const { data: invoices, error: invErr } = await supabase
    .from('invoices')
    .select('id, invoice_no, invoice_date, grand_total, created_at')
    .eq('customer_id', customerId)
  if (invErr) throw invErr

  const invoiceIds = (invoices ?? []).map((i) => i.id as string)

  let payments: { id: string; invoice_id: string; payment_date: string; amount: number; method: string }[] =
    []
  if (invoiceIds.length > 0) {
    const { data: pays, error: payErr } = await supabase
      .from('invoice_payments')
      .select('id, invoice_id, payment_date, amount, method')
      .in('invoice_id', invoiceIds)
    if (payErr) throw payErr
    payments = (pays as typeof payments) ?? []
  }

  const invoiceNoById = new Map<string, string>()
  for (const inv of invoices ?? []) {
    invoiceNoById.set(inv.id as string, inv.invoice_no as string)
  }

  const raw: Omit<LedgerEntry, 'runningBalance'>[] = []
  for (const inv of invoices ?? []) {
    raw.push({
      date: (inv.invoice_date as string) || (inv.created_at as string),
      type: 'invoice',
      reference: inv.invoice_no as string,
      description: 'Invoice raised',
      debit: Number(inv.grand_total ?? 0),
      credit: 0,
    })
  }
  for (const p of payments) {
    raw.push({
      date: p.payment_date,
      type: 'payment',
      reference: invoiceNoById.get(p.invoice_id) || '-',
      description: `Payment received (${p.method})`,
      debit: 0,
      credit: Number(p.amount ?? 0),
    })
  }

  raw.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let running = 0
  let totalDebit = 0
  let totalCredit = 0
  const entries: LedgerEntry[] = raw.map((e) => {
    running += e.debit - e.credit
    totalDebit += e.debit
    totalCredit += e.credit
    return { ...e, runningBalance: running }
  })

  return { entries, totalDebit, totalCredit, outstanding: running }
}

// ============================================================
// Dashboard metrics
// ============================================================

export interface DashboardMetrics {
  totalCustomers: number
  totalInvoices: number
  totalSales: number
  totalVat: number
  paymentsReceived: number
  outstandingReceivables: number
  monthlyRevenue: { month: string; revenue: number }[]
  dailyCollection: number
  cashCollection: number
  bankCollection: number
  topCustomers: { name: string; total: number }[]
  recentPayments: {
    id: string
    date: string
    amount: number
    method: string
    invoiceNo: string
    customer: string
  }[]
  overdueInvoices: InvoiceWithBalance[]
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = createClient()

  const invoices = await getInvoicesWithBalances()

  const [customersRes, paymentsRes] = await Promise.all([
    supabase.from('customers').select('id', { count: 'exact', head: true }),
    supabase
      .from('invoice_payments')
      .select('id, invoice_id, payment_date, amount, method, channel')
      .order('payment_date', { ascending: false }),
  ])

  if (paymentsRes.error) throw paymentsRes.error

  const payments = paymentsRes.data ?? []

  const invoiceById = new Map<string, InvoiceWithBalance>()
  for (const inv of invoices) invoiceById.set(inv.id, inv)

  const totalSales = invoices.reduce((s, i) => s + Number(i.grand_total ?? 0), 0)
  const totalVat = invoices.reduce((s, i) => s + Number(i.vat_amount ?? 0), 0)
  const paymentsReceived = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0)
  const outstandingReceivables = invoices.reduce((s, i) => s + i.outstanding, 0)

  const todayStr = new Date().toISOString().split('T')[0]
  const dailyCollection = payments
    .filter((p) => p.payment_date === todayStr)
    .reduce((s, p) => s + Number(p.amount ?? 0), 0)

  let cashCollection = 0
  let bankCollection = 0
  for (const p of payments) {
    if (p.channel === 'Bank') bankCollection += Number(p.amount ?? 0)
    else cashCollection += Number(p.amount ?? 0)
  }

  // Monthly revenue for the trailing 6 months (by invoice date)
  const monthKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const monthLabel = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  const months: { key: string; label: string }[] = []
  const cursor = new Date()
  cursor.setDate(1)
  for (let i = 5; i >= 0; i--) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1)
    months.push({ key: monthKey(d), label: monthLabel(d) })
  }
  const revenueByMonth = new Map<string, number>()
  for (const inv of invoices) {
    const dstr = inv.invoice_date || inv.created_at
    if (!dstr) continue
    const key = monthKey(new Date(dstr))
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + Number(inv.grand_total ?? 0))
  }
  const monthlyRevenue = months.map((m) => ({
    month: m.label,
    revenue: revenueByMonth.get(m.key) ?? 0,
  }))

  // Top customers by total invoiced
  const totalByCustomer = new Map<string, number>()
  for (const inv of invoices) {
    const name = inv.customer_name || 'Unknown'
    totalByCustomer.set(name, (totalByCustomer.get(name) ?? 0) + Number(inv.grand_total ?? 0))
  }
  const topCustomers = Array.from(totalByCustomer.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const recentPayments = payments.slice(0, 8).map((p) => {
    const inv = invoiceById.get(p.invoice_id as string)
    return {
      id: p.id as string,
      date: p.payment_date as string,
      amount: Number(p.amount ?? 0),
      method: p.method as string,
      invoiceNo: inv?.invoice_no ?? '-',
      customer: inv?.customer_name ?? '-',
    }
  })

  const overdueInvoices = invoices
    .filter((i) => i.isOverdue)
    .sort((a, b) => b.daysOverdue - a.daysOverdue)

  return {
    totalCustomers: customersRes.count ?? 0,
    totalInvoices: invoices.length,
    totalSales,
    totalVat,
    paymentsReceived,
    outstandingReceivables,
    monthlyRevenue,
    dailyCollection,
    cashCollection,
    bankCollection,
    topCustomers,
    recentPayments,
    overdueInvoices,
  }
}

// ============================================================
// Payment + customer mutations
// ============================================================

export async function addInvoicePayment(payment: {
  invoice_id: string
  payment_date: string
  amount: number
  method: string
  channel: 'Cash' | 'Bank'
  reference?: string | null
  notes?: string | null
}): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('invoice_payments').insert(payment)
  if (error) throw error
}

export interface ReceiptAllocation {
  invoice_id: string
  amount: number
}

/**
 * Save a receipt voucher: one payment row per allocated invoice, all sharing the
 * same voucher reference, date, method and channel. Returns the voucher number.
 */
export async function saveReceiptVoucher(input: {
  voucherNo: string
  paymentDate: string
  method: string
  channel: 'Cash' | 'Bank'
  reference?: string | null
  notes?: string | null
  allocations: ReceiptAllocation[]
}): Promise<string> {
  const supabase = createClient()
  const rows = input.allocations
    .filter((a) => a.amount > 0.0005)
    .map((a) => ({
      invoice_id: a.invoice_id,
      payment_date: input.paymentDate,
      amount: a.amount,
      method: input.method,
      channel: input.channel,
      reference: input.reference || input.voucherNo,
      notes: input.notes
        ? `${input.notes} (Receipt ${input.voucherNo})`
        : `Receipt voucher ${input.voucherNo}`,
    }))
  if (rows.length === 0) throw new Error('No allocations to save')
  const { error } = await supabase.from('invoice_payments').insert(rows)
  if (error) throw error
  return input.voucherNo
}

export async function getInvoicePayments(invoiceId: string): Promise<InvoicePayment[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('invoice_payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('payment_date', { ascending: true })
  if (error) throw error
  return (data as InvoicePayment[]) ?? []
}

export async function deleteInvoicePayment(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('invoice_payments').delete().eq('id', id)
  if (error) throw error
}

export async function getCustomers(): Promise<Customer[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return (data as Customer[]) ?? []
}

// ============================================================
// Security deposits
// ============================================================

export async function getDepositsForInvoice(invoiceId: string): Promise<SecurityDeposit[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('security_deposits')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('received_date', { ascending: true })
  if (error) throw error
  return (data as SecurityDeposit[]) ?? []
}

export async function addSecurityDeposit(deposit: {
  invoice_id: string | null
  customer_id: string | null
  amount: number
  received_date: string
  method?: string | null
  notes?: string | null
}): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('security_deposits').insert(deposit)
  if (error) throw error
}

export async function updateDepositRefund(
  id: string,
  update: {
    status: SecurityDeposit['status']
    refunded_amount: number
    refund_date: string | null
  }
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('security_deposits')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

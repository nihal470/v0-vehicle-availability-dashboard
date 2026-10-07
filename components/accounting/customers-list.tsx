'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { createClient } from '@/lib/supabase/client'
import { Loader2, Search, Users, ChevronRight, UserPlus } from 'lucide-react'

const EMPTY_FORM = {
  name: '',
  company: '',
  mobile: '',
  email: '',
  passport: '',
  nationality: '',
  licence: '',
  address: '',
}

interface CustomerRow extends Customer {
  invoiceCount: number
  totalInvoiced: number
  outstanding: number
}

export function CustomersList() {
  const [rows, setRows] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const setField = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError('Customer name is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data, error: insertError } = await supabase
        .from('customers')
        .insert({
          name: form.name.trim(),
          company: form.company.trim() || null,
          mobile: form.mobile.trim() || null,
          email: form.email.trim() || null,
          passport: form.passport.trim() || null,
          nationality: form.nationality.trim() || null,
          licence: form.licence.trim() || null,
          address: form.address.trim() || null,
        })
        .select('*')
        .single()
      if (insertError) throw insertError
      setRows((prev) =>
        [{ ...(data as Customer), invoiceCount: 0, totalInvoiced: 0, outstanding: 0 }, ...prev].sort(
          (a, b) => a.name.localeCompare(b.name)
        )
      )
      setForm(EMPTY_FORM)
      setDialogOpen(false)
    } catch (err) {
      console.error('[v0] Failed to create customer:', err)
      setError(err instanceof Error ? err.message : 'Failed to create customer.')
    } finally {
      setSaving(false)
    }
  }

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setError(null); setDialogOpen(true) }}>
          <UserPlus className="h-4 w-4 mr-2" />
          New Customer
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {search ? 'No customers match your search.' : 'No customers yet. Click "New Customer" to add one.'}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] flex-col gap-0 p-0 sm:max-w-lg">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>New Customer</DialogTitle>
            <DialogDescription>Add a customer to your records.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cust_name">Customer Name <span className="text-destructive">*</span></Label>
                <Input
                  id="cust_name"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cust_company">Company</Label>
                <Input id="cust_company" value={form.company} onChange={(e) => setField('company', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cust_mobile">Mobile</Label>
                <Input id="cust_mobile" value={form.mobile} onChange={(e) => setField('mobile', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cust_email">Email</Label>
                <Input id="cust_email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cust_nationality">Nationality</Label>
                <Input id="cust_nationality" value={form.nationality} onChange={(e) => setField('nationality', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cust_passport">Passport</Label>
                <Input id="cust_passport" value={form.passport} onChange={(e) => setField('passport', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cust_licence">Licence</Label>
                <Input id="cust_licence" value={form.licence} onChange={(e) => setField('licence', e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cust_address">Address</Label>
                <Input id="cust_address" value={form.address} onChange={(e) => setField('address', e.target.value)} />
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className="gap-2 border-t px-6 py-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
              {saving ? 'Saving...' : 'Create Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { contractStatusLabel, getContracts, nextContractNumber, type Contract, type ContractStatus } from '@/lib/contracts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FileSignature, Loader2, Plus, Search, Eye, Printer, Copy } from 'lucide-react'

const statuses: ContractStatus[] = ['draft', 'sent', 'partially_signed', 'signed', 'cancelled', 'expired']
const emptyForm = { customerId: '', vehicleId: '', startDate: '', endDate: '', pickupLocation: '', returnLocation: '', dailyRate: '', depositAmount: '', terms: 'The vehicle must be returned in the same condition. The renter is responsible for traffic fines, fuel, and damage during the rental period.', notes: '', signerName: '', signerEmail: '', signerMobile: '' }

export function ContractsDashboard({ initialContracts, customers, vehicles }: { initialContracts: Contract[]; customers: { id: string; name: string; email?: string | null; mobile?: string | null }[]; vehicles: { id: string; make: string; model: string; license_plate: string }[] }) {
  const [contracts, setContracts] = useState(initialContracts)
  const [customerOptions, setCustomerOptions] = useState(customers)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [customerSaving, setCustomerSaving] = useState(false)
  const [customerError, setCustomerError] = useState('')
  const [newCustomer, setNewCustomer] = useState({ name: '', mobile: '', email: '', company: '' })

  useEffect(() => setContracts(initialContracts), [initialContracts])

  const filtered = useMemo(() => contracts.filter((contract) => {
    const text = `${contract.contract_no} ${contract.customer?.name ?? ''} ${contract.vehicle?.license_plate ?? ''}`.toLowerCase()
    return text.includes(query.toLowerCase()) && (status === 'all' || contract.status === status)
  }), [contracts, query, status])

  const stats = useMemo(() => ({
    total: contracts.length,
    pending: contracts.filter((c) => ['draft', 'sent', 'partially_signed'].includes(c.status)).length,
    signed: contracts.filter((c) => c.status === 'signed').length,
    expired: contracts.filter((c) => c.status === 'expired').length,
  }), [contracts])

  const setField = (key: keyof typeof emptyForm, value: string) => setForm((current) => ({ ...current, [key]: value }))

  async function createCustomer() {
    if (!newCustomer.name.trim()) {
      setCustomerError('Customer name is required.')
      return
    }
    setCustomerSaving(true)
    setCustomerError('')
    try {
      const supabase = createClient()
      const { data, error: insertError } = await supabase.from('customers').insert({
        name: newCustomer.name.trim(),
        mobile: newCustomer.mobile.trim() || null,
        email: newCustomer.email.trim() || null,
        company: newCustomer.company.trim() || null,
      }).select('id, name, email, mobile').single()
      if (insertError) throw insertError
      const createdCustomer = data as { id: string; name: string; email?: string | null; mobile?: string | null }
      setCustomerOptions((current) => [...current, createdCustomer])
      setField('customerId', createdCustomer.id)
      setForm((current) => ({ ...current, signerName: createdCustomer.name, signerEmail: createdCustomer.email ?? '', signerMobile: createdCustomer.mobile ?? '' }))
      setNewCustomer({ name: '', mobile: '', email: '', company: '' })
      setCustomerDialogOpen(false)
    } catch (caught) {
      setCustomerError(caught instanceof Error ? caught.message : 'Unable to create customer.')
    } finally {
      setCustomerSaving(false)
    }
  }

  async function createContract() {
    if (!form.customerId || !form.vehicleId || !form.startDate || !form.endDate || !form.signerName) {
      setError('Customer, vehicle, dates, and signer name are required.')
      return
    }
    setSaving(true); setError('')
    try {
      const supabase = createClient()
      const customer = customerOptions.find((item) => item.id === form.customerId)
      const vehicle = vehicles.find((item) => item.id === form.vehicleId)
      const dailyRate = Number(form.dailyRate) || 0
      const days = Math.max(1, Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000))
      const { data: contract, error: contractError } = await supabase.from('contracts').insert({
        contract_no: nextContractNumber(), customer_id: form.customerId, vehicle_id: form.vehicleId, start_date: form.startDate, end_date: form.endDate,
        pickup_location: form.pickupLocation || null, return_location: form.returnLocation || null, daily_rate: dailyRate, total_amount: dailyRate * days,
        deposit_amount: Number(form.depositAmount) || 0, terms: form.terms, notes: form.notes || null,
      }).select('*').single()
      if (contractError) throw contractError
      const { data: signer, error: signerError } = await supabase.from('contract_signatories').insert({ contract_id: contract.id, name: form.signerName, email: form.signerEmail || null, mobile: form.signerMobile || null, role: 'customer' }).select('*').single()
      if (signerError) throw signerError
      await supabase.from('contract_events').insert({ contract_id: contract.id, event_type: 'created', description: 'Contract created', actor_name: 'Admin' })
      setContracts((current) => [{ ...contract, customer, vehicle, contract_signatories: [signer] }, ...current])
      setForm(emptyForm); setOpen(false)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to create contract.') } finally { setSaving(false) }
  }

  return <div className="flex flex-col gap-6">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div><p className="text-sm font-medium text-primary">Digital contract desk</p><h1 className="text-3xl font-semibold tracking-tight">Rental Contracts</h1><p className="text-muted-foreground">Create, track, print, and send agreements for signature.</p></div>
      <Button onClick={() => { setForm(emptyForm); setError(''); setOpen(true) }}><Plus data-icon="inline-start" /> New Contract</Button>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['Total contracts', stats.total], ['Awaiting action', stats.pending], ['Signed', stats.signed], ['Expired', stats.expired]].map(([label, value]) => <Card key={label}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></CardContent></Card>)}</div>
    <Card><CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><CardTitle className="flex items-center gap-2"><FileSignature className="size-5 text-primary" /> Contract register</CardTitle><div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search contracts" value={query} onChange={(event) => setQuery(event.target.value)} /></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{statuses.map((item) => <SelectItem key={item} value={item}>{contractStatusLabel(item)}</SelectItem>)}</SelectContent></Select></div></CardHeader><CardContent><div className="flex flex-col gap-3">{filtered.map((contract) => <div key={contract.id} className="flex flex-col gap-4 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"><div className="flex min-w-0 items-start gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><FileSignature className="size-5" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{contract.contract_no}</p><Badge variant={contract.status === 'signed' ? 'default' : contract.status === 'cancelled' ? 'destructive' : 'secondary'}>{contractStatusLabel(contract.status)}</Badge></div><p className="truncate text-sm text-muted-foreground">{contract.customer?.name ?? 'No customer'} · {contract.vehicle ? `${contract.vehicle.make} ${contract.vehicle.model} · ${contract.vehicle.license_plate}` : 'No vehicle'}</p><p className="text-xs text-muted-foreground">{contract.start_date} to {contract.end_date} · {contract.currency} {Number(contract.total_amount).toFixed(3)}</p></div></div><div className="flex gap-2"><Button variant="outline" size="sm" asChild><Link href={`/contracts/${contract.id}`}><Eye data-icon="inline-start" /> View</Link></Button><Button variant="ghost" size="sm" onClick={() => window.print()}><Printer /></Button></div></div>)}{filtered.length === 0 && <div className="py-16 text-center text-muted-foreground">No contracts match your filters.</div>}</div></CardContent></Card>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>New rental contract</DialogTitle><DialogDescription>Capture the agreement details and add the primary signer.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Customer"><div className="flex gap-2"><Select value={form.customerId} onValueChange={(value) => setField('customerId', value)}><SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder="Select customer" /></SelectTrigger><SelectContent>{customerOptions.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>)}</SelectContent></Select><Button type="button" variant="outline" size="icon" aria-label="Create new customer" onClick={() => { setCustomerError(''); setCustomerDialogOpen(true) }}><Plus data-icon="inline-start" /></Button></div></Field><Field label="Vehicle"><Select value={form.vehicleId} onValueChange={(value) => setField('vehicleId', value)}><SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger><SelectContent>{vehicles.map((vehicle) => <SelectItem key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model} · {vehicle.license_plate}</SelectItem>)}</SelectContent></Select></Field><Field label="Start date"><Input type="date" value={form.startDate} onChange={(event) => setField('startDate', event.target.value)} /></Field><Field label="End date"><Input type="date" value={form.endDate} onChange={(event) => setField('endDate', event.target.value)} /></Field><Field label="Daily rate"><Input type="number" min="0" step="0.001" value={form.dailyRate} onChange={(event) => setField('dailyRate', event.target.value)} /></Field><Field label="Deposit amount"><Input type="number" min="0" step="0.001" value={form.depositAmount} onChange={(event) => setField('depositAmount', event.target.value)} /></Field><Field label="Pickup location"><Input value={form.pickupLocation} onChange={(event) => setField('pickupLocation', event.target.value)} /></Field><Field label="Return location"><Input value={form.returnLocation} onChange={(event) => setField('returnLocation', event.target.value)} /></Field><Field label="Signer name"><Input value={form.signerName} onChange={(event) => setField('signerName', event.target.value)} /></Field><Field label="Signer email"><Input type="email" value={form.signerEmail} onChange={(event) => setField('signerEmail', event.target.value)} /></Field><Field label="Signer mobile"><Input value={form.signerMobile} onChange={(event) => setField('signerMobile', event.target.value)} /></Field><div className="sm:col-span-2"><Label>Terms</Label><Textarea className="mt-2 min-h-28" value={form.terms} onChange={(event) => setField('terms', event.target.value)} /></div><div className="sm:col-span-2"><Label>Notes</Label><Textarea className="mt-2" value={form.notes} onChange={(event) => setField('notes', event.target.value)} /></div></div>{error && <p className="text-sm text-destructive">{error}</p>}<DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={createContract} disabled={saving}>{saving ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}{saving ? 'Saving...' : 'Create contract'}</Button></DialogFooter></DialogContent></Dialog><Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>New customer</DialogTitle><DialogDescription>Create a customer and use them as the primary signer.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Name"><Input autoFocus value={newCustomer.name} onChange={(event) => setNewCustomer((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" /></Field><Field label="Company"><Input value={newCustomer.company} onChange={(event) => setNewCustomer((current) => ({ ...current, company: event.target.value }))} /></Field><Field label="Mobile"><Input value={newCustomer.mobile} onChange={(event) => setNewCustomer((current) => ({ ...current, mobile: event.target.value }))} /></Field><Field label="Email"><Input type="email" value={newCustomer.email} onChange={(event) => setNewCustomer((current) => ({ ...current, email: event.target.value }))} /></Field></div>{customerError && <p className="text-sm text-destructive">{customerError}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => setCustomerDialogOpen(false)}>Cancel</Button><Button type="button" onClick={createCustomer} disabled={customerSaving}>{customerSaving && <Loader2 data-icon="inline-start" className="animate-spin" />}Create customer</Button></DialogFooter></DialogContent></Dialog>
  </div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="flex flex-col gap-2"><Label>{label}</Label>{children}</div> }

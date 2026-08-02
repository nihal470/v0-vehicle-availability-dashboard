'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ServiceRecord, Vehicle } from '@/lib/types'
import { computeServiceStatus, SERVICE_STATUS_META } from '@/lib/service-status'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Pencil,
  Trash2,
  FileUp,
  FileText,
  Download,
  Printer,
  Bell,
  Loader2,
  Wrench,
} from 'lucide-react'
import { format } from 'date-fns'

const BUCKET = 'inspection-photos'

const SERVICE_TYPES = [
  'General Service',
  'Oil Change',
  'Tyre Replacement',
  'Brake Service',
  'AC Service',
  'Battery Replacement',
  'Engine Repair',
  'Body Work',
  'Inspection / PPM',
  'Other',
]

interface Props {
  initialRecords: ServiceRecord[]
  vehicles: Vehicle[]
}

interface FormState {
  vehicle_id: string
  registration_number: string
  current_odometer: string
  service_date: string
  odometer_reading: string
  service_type: string
  service_center: string
  cost: string
  notes: string
  next_service_date: string
  next_service_km: string
}

const emptyForm = (): FormState => ({
  vehicle_id: '',
  registration_number: '',
  current_odometer: '',
  service_date: format(new Date(), 'yyyy-MM-dd'),
  odometer_reading: '',
  service_type: 'General Service',
  service_center: '',
  cost: '',
  notes: '',
  next_service_date: '',
  next_service_km: '',
})

export function VehicleServiceTracker({ initialRecords, vehicles }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [records] = useState<ServiceRecord[]>(initialRecords)
  const [search, setSearch] = useState('')
  const [vehicleFilter, setVehicleFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<ServiceRecord | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const vehicleLabel = (v?: Vehicle | null) =>
    v ? `${v.license_plate} — ${v.make} ${v.model}` : 'Unknown vehicle'

  // Latest record per vehicle for status computation
  const latestByVehicle = useMemo(() => {
    const map = new Map<string, ServiceRecord>()
    for (const r of records) if (!map.has(r.vehicle_id)) map.set(r.vehicle_id, r)
    return map
  }, [records])

  const statusForVehicle = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId)
    const latest = latestByVehicle.get(vehicleId)
    return computeServiceStatus(
      latest?.next_service_date ?? vehicle?.next_service_date,
      latest?.next_service_km ?? vehicle?.next_service_km,
      vehicle?.current_km,
    )
  }

  // Reminders: vehicles that are overdue or due soon
  const reminders = useMemo(() => {
    return vehicles
      .map((v) => {
        const latest = latestByVehicle.get(v.id)
        const status = computeServiceStatus(
          latest?.next_service_date ?? v.next_service_date,
          latest?.next_service_km ?? v.next_service_km,
          v.current_km,
        )
        return {
          vehicle: v,
          status,
          nextDate: latest?.next_service_date ?? v.next_service_date,
          nextKm: latest?.next_service_km ?? v.next_service_km,
        }
      })
      .filter((r) => r.status !== 'up_to_date')
      .sort((a, b) => (a.status === 'overdue' ? -1 : 1) - (b.status === 'overdue' ? -1 : 1))
  }, [vehicles, latestByVehicle])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return records.filter((r) => {
      if (vehicleFilter !== 'all' && r.vehicle_id !== vehicleFilter) return false
      if (fromDate && r.service_date < fromDate) return false
      if (toDate && r.service_date > toDate) return false
      if (q) {
        const hay = `${r.registration_number ?? ''} ${vehicleLabel(r.vehicle)} ${r.service_type} ${r.service_center ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [records, search, vehicleFilter, fromDate, toDate])

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm())
    setInvoiceFile(null)
    setError(null)
    setShowDialog(true)
  }

  const openEdit = (rec: ServiceRecord) => {
    setEditing(rec)
    const vehicle = vehicles.find((v) => v.id === rec.vehicle_id)
    setForm({
      vehicle_id: rec.vehicle_id,
      registration_number: rec.registration_number ?? '',
      current_odometer: vehicle?.current_km != null ? String(vehicle.current_km) : '',
      service_date: rec.service_date,
      odometer_reading: rec.odometer_reading != null ? String(rec.odometer_reading) : '',
      service_type: rec.service_type,
      service_center: rec.service_center ?? '',
      cost: rec.cost != null ? String(rec.cost) : '',
      notes: rec.notes ?? '',
      next_service_date: rec.next_service_date ?? '',
      next_service_km: rec.next_service_km != null ? String(rec.next_service_km) : '',
    })
    setInvoiceFile(null)
    setError(null)
    setShowDialog(true)
  }

  const onSelectVehicle = (id: string) => {
    const v = vehicles.find((x) => x.id === id)
    setForm((prev) => ({
      ...prev,
      vehicle_id: id,
      registration_number: v?.license_plate ?? '',
      current_odometer: v?.current_km != null ? String(v.current_km) : '',
      // Pre-fill odometer reading with current km if empty
      odometer_reading: prev.odometer_reading || (v?.current_km != null ? String(v.current_km) : ''),
    }))
  }

  const uploadInvoice = async (vehicleId: string): Promise<{ url: string; path: string } | null> => {
    if (!invoiceFile) return null
    const ext = invoiceFile.name.split('.').pop() || 'dat'
    const path = `service-invoices/${vehicleId}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, invoiceFile, { contentType: invoiceFile.type || undefined, upsert: false })
    if (upErr) throw upErr
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return { url: data.publicUrl, path }
  }

  const handleSave = async () => {
    if (!form.vehicle_id) {
      setError('Please select a vehicle.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      let invoice = editing
        ? { url: editing.invoice_url, path: editing.invoice_path }
        : { url: null as string | null, path: null as string | null }
      if (invoiceFile) {
        const uploaded = await uploadInvoice(form.vehicle_id)
        if (uploaded) invoice = uploaded
      }

      const payload = {
        vehicle_id: form.vehicle_id,
        registration_number: form.registration_number.trim() || null,
        service_date: form.service_date,
        odometer_reading: form.odometer_reading ? parseInt(form.odometer_reading, 10) : null,
        service_type: form.service_type,
        service_center: form.service_center.trim() || null,
        cost: form.cost ? parseFloat(form.cost) : 0,
        notes: form.notes.trim() || null,
        invoice_url: invoice.url,
        invoice_path: invoice.path,
        next_service_date: form.next_service_date || null,
        next_service_km: form.next_service_km ? parseInt(form.next_service_km, 10) : null,
      }

      if (editing) {
        const { error: upErr } = await supabase
          .from('service_records')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editing.id)
        if (upErr) throw upErr
      } else {
        const { error: insErr } = await supabase.from('service_records').insert(payload)
        if (insErr) throw insErr
      }

      // Keep the vehicle's rolling service fields in sync with the latest entry
      await supabase
        .from('vehicles')
        .update({
          last_service_date: form.service_date,
          last_service_km: payload.odometer_reading,
          next_service_date: payload.next_service_date,
          next_service_km: payload.next_service_km,
          current_km: payload.odometer_reading ?? undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', form.vehicle_id)

      setShowDialog(false)
      router.refresh()
    } catch (err) {
      console.error('[v0] Failed to save service record:', err)
      setError(err instanceof Error ? err.message : 'Failed to save service record')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (rec: ServiceRecord) => {
    if (!confirm('Delete this service record?')) return
    try {
      const { error: delErr } = await supabase.from('service_records').delete().eq('id', rec.id)
      if (delErr) throw delErr
      if (rec.invoice_path) {
        await supabase.storage.from(BUCKET).remove([rec.invoice_path])
      }
      router.refresh()
    } catch (err) {
      console.error('[v0] Failed to delete service record:', err)
      alert('Failed to delete record')
    }
  }

  const exportCsv = () => {
    const headers = [
      'Service Date',
      'Vehicle',
      'Registration',
      'Odometer',
      'Service Type',
      'Service Center',
      'Cost (OMR)',
      'Next Service Date',
      'Next Service KM',
      'Notes',
    ]
    const rows = filtered.map((r) => [
      r.service_date,
      vehicleLabel(r.vehicle),
      r.registration_number ?? '',
      r.odometer_reading ?? '',
      r.service_type,
      r.service_center ?? '',
      Number(r.cost || 0).toFixed(3),
      r.next_service_date ?? '',
      r.next_service_km ?? '',
      (r.notes ?? '').replace(/"/g, '""'),
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `service-history-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalCost = filtered.reduce((sum, r) => sum + Number(r.cost || 0), 0)

  return (
    <div className="space-y-6">
      {/* Reminders */}
      {reminders.length > 0 && (
        <Card className="border-amber-200 print:hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-600" />
              Service Reminders
              <Badge variant="secondary" className="ml-1">
                {reminders.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {reminders.map(({ vehicle, status, nextDate, nextKm }) => {
                const meta = SERVICE_STATUS_META[status]
                return (
                  <div
                    key={vehicle.id}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2 bg-muted/30"
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} aria-hidden />
                    <div className="text-sm">
                      <p className="font-medium">{vehicle.license_plate}</p>
                      <p className="text-xs text-muted-foreground">
                        {nextDate ? `Due ${format(new Date(nextDate), 'dd MMM yyyy')}` : ''}
                        {nextDate && nextKm ? ' · ' : ''}
                        {nextKm ? `${nextKm.toLocaleString()} km` : ''}
                      </p>
                    </div>
                    <Badge variant="outline" className={meta.badgeClass}>
                      {meta.label}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Service History
            </CardTitle>
            <div className="flex items-center gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vehicle, reg, type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
              <SelectTrigger aria-label="Filter by vehicle">
                <SelectValue placeholder="All vehicles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All vehicles</SelectItem>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.license_plate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Label htmlFor="from" className="text-xs text-muted-foreground whitespace-nowrap">
                From
              </Label>
              <Input
                id="from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="to" className="text-xs text-muted-foreground whitespace-nowrap">
                To
              </Label>
              <Input
                id="to"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Center</TableHead>
                  <TableHead className="text-right">Odometer</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right print:hidden">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No service records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => {
                    const meta = SERVICE_STATUS_META[statusForVehicle(r.vehicle_id)]
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(r.service_date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{r.registration_number || vehicleLabel(r.vehicle)}</div>
                          {r.vehicle && (
                            <div className="text-xs text-muted-foreground">
                              {r.vehicle.make} {r.vehicle.model}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{r.service_type}</TableCell>
                        <TableCell>{r.service_center || '—'}</TableCell>
                        <TableCell className="text-right">
                          {r.odometer_reading != null ? r.odometer_reading.toLocaleString() : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          OMR {Number(r.cost || 0).toFixed(3)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={meta.badgeClass}>
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {r.invoice_url ? (
                            <a
                              href={r.invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              View
                            </a>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-right print:hidden">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(r)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {filtered.length > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{filtered.length} record(s)</span>
              <span className="font-medium text-foreground">
                Total: OMR {totalCost.toFixed(3)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Service Record' : 'Add Service Record'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Vehicle details */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Vehicle Details</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <Label htmlFor="vehicle">Select Vehicle *</Label>
                  <Select value={form.vehicle_id} onValueChange={onSelectVehicle}>
                    <SelectTrigger id="vehicle">
                      <SelectValue placeholder="Choose vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.license_plate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="reg">Registration Number</Label>
                  <Input
                    id="reg"
                    value={form.registration_number}
                    onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="curOdo">Current Odometer</Label>
                  <Input id="curOdo" value={form.current_odometer} disabled className="bg-muted" />
                </div>
              </div>
            </div>

            {/* Service record */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Service Record</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="sdate">Service Date *</Label>
                  <Input
                    id="sdate"
                    type="date"
                    value={form.service_date}
                    onChange={(e) => setForm({ ...form, service_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="odo">Odometer Reading</Label>
                  <Input
                    id="odo"
                    type="number"
                    value={form.odometer_reading}
                    onChange={(e) => setForm({ ...form, odometer_reading: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="stype">Service Type</Label>
                  <Select
                    value={form.service_type}
                    onValueChange={(v) => setForm({ ...form, service_type: v })}
                  >
                    <SelectTrigger id="stype">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="center">Service Center</Label>
                  <Input
                    id="center"
                    value={form.service_center}
                    onChange={(e) => setForm({ ...form, service_center: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cost">Cost (OMR)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.001"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice">Upload Invoice (optional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="invoice"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
                      className="cursor-pointer"
                    />
                    {invoiceFile && <FileUp className="h-4 w-4 text-emerald-600 shrink-0" />}
                  </div>
                  {editing?.invoice_url && !invoiceFile && (
                    <a
                      href={editing.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Current invoice attached
                    </a>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Next service */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Next Service</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="ndate">Next Service Date</Label>
                  <Input
                    id="ndate"
                    type="date"
                    value={form.next_service_date}
                    onChange={(e) => setForm({ ...form, next_service_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="nkm">Next Service KM</Label>
                  <Input
                    id="nkm"
                    type="number"
                    value={form.next_service_km}
                    onChange={(e) => setForm({ ...form, next_service_km: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {editing ? 'Save Changes' : 'Add Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

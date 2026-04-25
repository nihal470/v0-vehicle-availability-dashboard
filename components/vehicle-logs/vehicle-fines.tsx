'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Search, AlertTriangle, DollarSign, Calendar, User, Pencil, Trash2, CheckCircle, Clock, XCircle, Car, Info } from 'lucide-react'
import type { VehicleFine, TripLog, Vehicle, FinePaymentStatus } from '@/lib/types'

interface VehicleFinesProps {
  initialFines: (VehicleFine & { vehicle: Vehicle; trip_log?: TripLog })[]
  vehicles: Vehicle[]
  tripLogs: (TripLog & { vehicle: Vehicle })[]
}

const fineTypes = [
  'Speeding',
  'Parking Violation',
  'Red Light',
  'Illegal Turn',
  'No Seatbelt',
  'Mobile Phone Use',
  'Expired Registration',
  'Toll Violation',
  'Other'
]

export function VehicleFines({ initialFines, vehicles, tripLogs }: VehicleFinesProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [fines, setFines] = useState(initialFines)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingFine, setEditingFine] = useState<VehicleFine | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [matchedDriver, setMatchedDriver] = useState<string | null>(null)
  const [matchedTripLog, setMatchedTripLog] = useState<TripLog | null>(null)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterVehicle, setFilterVehicle] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterDriver, setFilterDriver] = useState<string>('all')
  
  // Form state
  const [formData, setFormData] = useState({
    fine_reference: '',
    vehicle_id: '',
    fine_date: format(new Date(), 'yyyy-MM-dd'),
    fine_time: '',
    driver_name: '',
    fine_type: '',
    fine_description: '',
    fine_amount: '',
    payment_status: 'unpaid' as FinePaymentStatus,
    payment_date: '',
    payment_reference: '',
    location: '',
    notes: '',
  })

  const resetForm = () => {
    setFormData({
      fine_reference: '',
      vehicle_id: '',
      fine_date: format(new Date(), 'yyyy-MM-dd'),
      fine_time: '',
      driver_name: '',
      fine_type: '',
      fine_description: '',
      fine_amount: '',
      payment_status: 'unpaid',
      payment_date: '',
      payment_reference: '',
      location: '',
      notes: '',
    })
    setMatchedDriver(null)
    setMatchedTripLog(null)
  }

  // Auto-match driver based on vehicle, date, and time
  const findMatchingDriver = (vehicleId: string, date: string, time: string) => {
    if (!vehicleId || !date) {
      setMatchedDriver(null)
      setMatchedTripLog(null)
      return
    }

    const matchingLogs = tripLogs.filter(log => {
      if (log.vehicle_id !== vehicleId) return false
      if (log.trip_date !== date) return false
      
      if (time && log.time_out && log.time_in) {
        // Check if fine time falls within trip time range
        return time >= log.time_out && time <= log.time_in
      }
      
      // If no time specified or trip still in progress, match by date only
      return true
    })

    if (matchingLogs.length > 0) {
      const bestMatch = matchingLogs[0]
      setMatchedDriver(bestMatch.driver_name)
      setMatchedTripLog(bestMatch)
      setFormData(prev => ({ ...prev, driver_name: bestMatch.driver_name }))
    } else {
      setMatchedDriver(null)
      setMatchedTripLog(null)
    }
  }

  const handleCreate = async () => {
    if (!formData.vehicle_id || !formData.fine_type || !formData.fine_amount) {
      alert('Please fill in required fields: Vehicle, Fine Type, and Amount')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.from('vehicle_fines').insert({
        fine_reference: formData.fine_reference.trim() || null,
        vehicle_id: formData.vehicle_id,
        trip_log_id: matchedTripLog?.id || null,
        fine_date: formData.fine_date,
        fine_time: formData.fine_time || null,
        driver_name: formData.driver_name.trim() || null,
        fine_type: formData.fine_type,
        fine_description: formData.fine_description.trim() || null,
        fine_amount: parseFloat(formData.fine_amount),
        payment_status: formData.payment_status,
        payment_date: formData.payment_date || null,
        payment_reference: formData.payment_reference.trim() || null,
        location: formData.location.trim() || null,
        notes: formData.notes.trim() || null,
      })

      if (error) throw error

      setShowAddDialog(false)
      resetForm()
      router.refresh()
    } catch (error) {
      console.error('Error creating fine:', error)
      alert('Failed to create fine')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingFine) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('vehicle_fines')
        .update({
          fine_reference: formData.fine_reference.trim() || null,
          vehicle_id: formData.vehicle_id,
          fine_date: formData.fine_date,
          fine_time: formData.fine_time || null,
          driver_name: formData.driver_name.trim() || null,
          fine_type: formData.fine_type,
          fine_description: formData.fine_description.trim() || null,
          fine_amount: parseFloat(formData.fine_amount),
          payment_status: formData.payment_status,
          payment_date: formData.payment_date || null,
          payment_reference: formData.payment_reference.trim() || null,
          location: formData.location.trim() || null,
          notes: formData.notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingFine.id)

      if (error) throw error

      setShowEditDialog(false)
      setEditingFine(null)
      resetForm()
      router.refresh()
    } catch (error) {
      console.error('Error updating fine:', error)
      alert('Failed to update fine')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fine record?')) return

    try {
      const { error } = await supabase.from('vehicle_fines').delete().eq('id', id)
      if (error) throw error
      router.refresh()
    } catch (error) {
      console.error('Error deleting fine:', error)
      alert('Failed to delete fine')
    }
  }

  const handleMarkPaid = async (fine: VehicleFine) => {
    try {
      const { error } = await supabase
        .from('vehicle_fines')
        .update({
          payment_status: 'paid',
          payment_date: format(new Date(), 'yyyy-MM-dd'),
          updated_at: new Date().toISOString(),
        })
        .eq('id', fine.id)

      if (error) throw error
      router.refresh()
    } catch (error) {
      console.error('Error marking fine as paid:', error)
      alert('Failed to update payment status')
    }
  }

  const openEditDialog = (fine: VehicleFine) => {
    setEditingFine(fine)
    setFormData({
      fine_reference: fine.fine_reference || '',
      vehicle_id: fine.vehicle_id,
      fine_date: fine.fine_date,
      fine_time: fine.fine_time || '',
      driver_name: fine.driver_name || '',
      fine_type: fine.fine_type,
      fine_description: fine.fine_description || '',
      fine_amount: fine.fine_amount.toString(),
      payment_status: fine.payment_status,
      payment_date: fine.payment_date || '',
      payment_reference: fine.payment_reference || '',
      location: fine.location || '',
      notes: fine.notes || '',
    })
    setShowEditDialog(true)
  }

  // Filter fines
  const filteredFines = fines.filter(fine => {
    const matchesSearch = searchQuery === '' || 
      fine.driver_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fine.vehicle?.license_plate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fine.fine_reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fine.fine_type?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesVehicle = filterVehicle === 'all' || fine.vehicle_id === filterVehicle
    const matchesStatus = filterStatus === 'all' || fine.payment_status === filterStatus
    const matchesDriver = filterDriver === 'all' || fine.driver_name === filterDriver
    
    return matchesSearch && matchesVehicle && matchesStatus && matchesDriver
  })

  // Get unique drivers
  const uniqueDrivers = [...new Set(fines.filter(f => f.driver_name).map(f => f.driver_name!))]

  // Calculate totals
  const totalUnpaid = fines.filter(f => f.payment_status === 'unpaid').reduce((sum, f) => sum + Number(f.fine_amount), 0)
  const totalPending = fines.filter(f => f.payment_status === 'pending').reduce((sum, f) => sum + Number(f.fine_amount), 0)

  const getStatusBadge = (status: FinePaymentStatus) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>
      case 'pending':
        return <Badge className="bg-amber-500 hover:bg-amber-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'unpaid':
        return <Badge className="bg-red-500 hover:bg-red-600"><XCircle className="h-3 w-3 mr-1" />Unpaid</Badge>
    }
  }

  return (
    <div className="space-y-4">
      {/* Unpaid Alert */}
      {totalUnpaid > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Outstanding Fines:</strong> AED {totalUnpaid.toLocaleString()} unpaid
            {totalPending > 0 && <span> + AED {totalPending.toLocaleString()} pending</span>}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reference, driver, vehicle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-40">
              <Label className="text-xs text-muted-foreground">Vehicle</Label>
              <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vehicles</SelectItem>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.license_plate}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <Label className="text-xs text-muted-foreground">Driver</Label>
              <Select value={filterDriver} onValueChange={setFilterDriver}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Drivers</SelectItem>
                  {uniqueDrivers.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Fine
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Fines Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Fines & Violations ({filteredFines.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No fines found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFines.map((fine) => (
                    <TableRow key={fine.id}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {format(new Date(fine.fine_date), 'dd-MMM-yy')}
                        </div>
                        {fine.fine_time && (
                          <span className="text-xs text-muted-foreground">{fine.fine_time}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{fine.fine_reference || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{fine.vehicle?.license_plate}</Badge>
                      </TableCell>
                      <TableCell>
                        {fine.driver_name ? (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            {fine.driver_name}
                          </div>
                        ) : (
                          <span className="text-amber-600 text-sm">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{fine.fine_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 font-medium">
                          <DollarSign className="h-3.5 w-3.5" />
                          {Number(fine.fine_amount).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(fine.payment_status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {fine.payment_status !== 'paid' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-emerald-600 hover:text-emerald-700"
                              onClick={() => handleMarkPaid(fine)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(fine)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(fine.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Fine / Violation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Vehicle *</Label>
                <Select 
                  value={formData.vehicle_id} 
                  onValueChange={(v) => {
                    setFormData(p => ({ ...p, vehicle_id: v }))
                    findMatchingDriver(v, formData.fine_date, formData.fine_time)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.license_plate} - {v.make} {v.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fine Reference</Label>
                <Input
                  placeholder="e.g., FN-12345"
                  value={formData.fine_reference}
                  onChange={(e) => setFormData(p => ({ ...p, fine_reference: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fine Date *</Label>
                <Input
                  type="date"
                  value={formData.fine_date}
                  onChange={(e) => {
                    setFormData(p => ({ ...p, fine_date: e.target.value }))
                    findMatchingDriver(formData.vehicle_id, e.target.value, formData.fine_time)
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Fine Time</Label>
                <Input
                  type="time"
                  value={formData.fine_time}
                  onChange={(e) => {
                    setFormData(p => ({ ...p, fine_time: e.target.value }))
                    findMatchingDriver(formData.vehicle_id, formData.fine_date, e.target.value)
                  }}
                />
              </div>
            </div>

            {/* Driver Match Suggestion */}
            {matchedDriver && (
              <Alert className="border-emerald-200 bg-emerald-50">
                <Info className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-800">
                  <strong>Driver Match Found:</strong> {matchedDriver} was using this vehicle at the specified date/time.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label>Driver Name</Label>
              <Input
                placeholder="Driver responsible"
                value={formData.driver_name}
                onChange={(e) => setFormData(p => ({ ...p, driver_name: e.target.value }))}
              />
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fine Type *</Label>
                <Select value={formData.fine_type} onValueChange={(v) => setFormData(p => ({ ...p, fine_type: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {fineTypes.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (AED) *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.fine_amount}
                  onChange={(e) => setFormData(p => ({ ...p, fine_amount: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                placeholder="Where the fine was issued"
                value={formData.location}
                onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={formData.payment_status} onValueChange={(v) => setFormData(p => ({ ...p, payment_status: v as FinePaymentStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {formData.payment_status === 'paid' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <Input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData(p => ({ ...p, payment_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Reference</Label>
                  <Input
                    placeholder="Receipt/Transaction #"
                    value={formData.payment_reference}
                    onChange={(e) => setFormData(p => ({ ...p, payment_reference: e.target.value }))}
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Description / Notes</Label>
              <Textarea
                placeholder="Additional details..."
                value={formData.notes}
                onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Add Fine'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Fine
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Vehicle *</Label>
                <Select value={formData.vehicle_id} onValueChange={(v) => setFormData(p => ({ ...p, vehicle_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.license_plate} - {v.make} {v.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fine Reference</Label>
                <Input
                  value={formData.fine_reference}
                  onChange={(e) => setFormData(p => ({ ...p, fine_reference: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fine Date *</Label>
                <Input
                  type="date"
                  value={formData.fine_date}
                  onChange={(e) => setFormData(p => ({ ...p, fine_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fine Time</Label>
                <Input
                  type="time"
                  value={formData.fine_time}
                  onChange={(e) => setFormData(p => ({ ...p, fine_time: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Driver Name</Label>
              <Input
                value={formData.driver_name}
                onChange={(e) => setFormData(p => ({ ...p, driver_name: e.target.value }))}
              />
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fine Type *</Label>
                <Select value={formData.fine_type} onValueChange={(v) => setFormData(p => ({ ...p, fine_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fineTypes.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (AED) *</Label>
                <Input
                  type="number"
                  value={formData.fine_amount}
                  onChange={(e) => setFormData(p => ({ ...p, fine_amount: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={formData.payment_status} onValueChange={(v) => setFormData(p => ({ ...p, payment_status: v as FinePaymentStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {formData.payment_status === 'paid' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <Input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData(p => ({ ...p, payment_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Reference</Label>
                  <Input
                    value={formData.payment_reference}
                    onChange={(e) => setFormData(p => ({ ...p, payment_reference: e.target.value }))}
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setEditingFine(null); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

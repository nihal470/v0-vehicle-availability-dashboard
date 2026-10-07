'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TimeSelect } from '@/components/ui/time-select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search, Car, Clock, User, Calendar, Pencil, Trash2, Filter } from 'lucide-react'
import type { TripLog, Vehicle } from '@/lib/types'

interface TripLogsProps {
  initialLogs: (TripLog & { vehicle: Vehicle })[]
  vehicles: Vehicle[]
}

export function TripLogs({ initialLogs, vehicles }: TripLogsProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [logs, setLogs] = useState(initialLogs)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingLog, setEditingLog] = useState<TripLog | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterVehicle, setFilterVehicle] = useState<string>('all')
  const [filterDate, setFilterDate] = useState('')
  
  // Form state
  const [formData, setFormData] = useState({
    vehicle_id: '',
    trip_date: format(new Date(), 'yyyy-MM-dd'),
    trip_end_date: '',
    driver_name: '',
    time_out: '',
    time_in: '',
    trip_purpose: '',
    odometer_start: '',
    odometer_end: '',
    notes: '',
  })

  const resetForm = () => {
    setFormData({
      vehicle_id: '',
      trip_date: format(new Date(), 'yyyy-MM-dd'),
      trip_end_date: '',
      driver_name: '',
      time_out: '',
      time_in: '',
      trip_purpose: '',
      odometer_start: '',
      odometer_end: '',
      notes: '',
    })
  }

  const handleCreate = async () => {
    if (!formData.vehicle_id || !formData.driver_name || !formData.time_out) {
      alert('Please fill in required fields: Vehicle, Driver Name, and Time Out')
      return
    }

    // Validate time_in is after time_out
    if (formData.time_in && formData.time_in < formData.time_out) {
      alert('Time In cannot be earlier than Time Out')
      return
    }

    // Validate trip_end_date is not before trip_date
    if (formData.trip_end_date && formData.trip_end_date < formData.trip_date) {
      alert('Trip End Date cannot be earlier than Trip Date')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.from('trip_logs').insert({
        vehicle_id: formData.vehicle_id,
        trip_date: formData.trip_date,
        trip_end_date: formData.trip_end_date || null,
        driver_name: formData.driver_name.trim(),
        time_out: formData.time_out,
        time_in: formData.time_in || null,
        trip_purpose: formData.trip_purpose.trim() || null,
        odometer_start: formData.odometer_start ? parseInt(formData.odometer_start) : null,
        odometer_end: formData.odometer_end ? parseInt(formData.odometer_end) : null,
        notes: formData.notes.trim() || null,
      })

      if (error) throw error

      setShowAddDialog(false)
      resetForm()
      router.refresh()
    } catch (error) {
      console.error('Error creating trip log:', error)
      alert('Failed to create trip log')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingLog) return

    if (formData.time_in && formData.time_in < formData.time_out) {
      alert('Time In cannot be earlier than Time Out')
      return
    }

    if (formData.trip_end_date && formData.trip_end_date < formData.trip_date) {
      alert('Trip End Date cannot be earlier than Trip Date')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('trip_logs')
        .update({
          vehicle_id: formData.vehicle_id,
          trip_date: formData.trip_date,
          trip_end_date: formData.trip_end_date || null,
          driver_name: formData.driver_name.trim(),
          time_out: formData.time_out,
          time_in: formData.time_in || null,
          trip_purpose: formData.trip_purpose.trim() || null,
          odometer_start: formData.odometer_start ? parseInt(formData.odometer_start) : null,
          odometer_end: formData.odometer_end ? parseInt(formData.odometer_end) : null,
          notes: formData.notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingLog.id)

      if (error) throw error

      setShowEditDialog(false)
      setEditingLog(null)
      resetForm()
      router.refresh()
    } catch (error) {
      console.error('Error updating trip log:', error)
      alert('Failed to update trip log')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trip log?')) return

    try {
      const { error } = await supabase.from('trip_logs').delete().eq('id', id)
      if (error) throw error
      router.refresh()
    } catch (error) {
      console.error('Error deleting trip log:', error)
      alert('Failed to delete trip log')
    }
  }

  const openEditDialog = (log: TripLog) => {
    setEditingLog(log)
    setFormData({
      vehicle_id: log.vehicle_id,
      trip_date: log.trip_date,
      trip_end_date: log.trip_end_date || '',
      driver_name: log.driver_name,
      time_out: log.time_out,
      time_in: log.time_in || '',
      trip_purpose: log.trip_purpose || '',
      odometer_start: log.odometer_start?.toString() || '',
      odometer_end: log.odometer_end?.toString() || '',
      notes: log.notes || '',
    })
    setShowEditDialog(true)
  }

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchQuery === '' || 
      log.driver_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.vehicle?.license_plate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.trip_purpose?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesVehicle = filterVehicle === 'all' || log.vehicle_id === filterVehicle
    const matchesDate = filterDate === '' || log.trip_date === filterDate
    
    return matchesSearch && matchesVehicle && matchesDate
  })

  // Get unique drivers for suggestions
  const uniqueDrivers = [...new Set(logs.map(log => log.driver_name))]

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search driver, vehicle, purpose..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-48">
              <Label className="text-xs text-muted-foreground">Vehicle</Label>
              <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                <SelectTrigger>
                  <SelectValue placeholder="All Vehicles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vehicles</SelectItem>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.license_plate}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Trip Log
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Trip Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Trip Logs ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Time Out</TableHead>
                  <TableHead>Time In</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Odometer</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No trip logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span>{format(new Date(log.trip_date), 'dd-MMM-yy')}</span>
                            {log.trip_end_date && log.trip_end_date !== log.trip_date && (
                              <span className="text-xs text-muted-foreground">
                                to {format(new Date(log.trip_end_date), 'dd-MMM-yy')}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.vehicle?.license_plate}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {log.driver_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-emerald-600">
                          <Clock className="h-3.5 w-3.5" />
                          {log.time_out}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.time_in ? (
                          <div className="flex items-center gap-1.5 text-amber-600">
                            <Clock className="h-3.5 w-3.5" />
                            {log.time_in}
                          </div>
                        ) : (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">In Progress</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {log.trip_purpose || '-'}
                      </TableCell>
                      <TableCell>
                        {log.odometer_start && log.odometer_end ? (
                          <span className="text-sm">
                            {log.odometer_start} → {log.odometer_end}
                            <span className="text-muted-foreground ml-1">
                              ({log.odometer_end - log.odometer_start} km)
                            </span>
                          </span>
                        ) : log.odometer_start ? (
                          <span className="text-sm">{log.odometer_start} km</span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(log)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(log.id)}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Trip Log
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
                <Label>Trip Date *</Label>
                <Input
                  type="date"
                  value={formData.trip_date}
                  onChange={(e) => setFormData(p => ({ ...p, trip_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Trip End Date</Label>
              <Input
                type="date"
                value={formData.trip_end_date}
                min={formData.trip_date}
                onChange={(e) => setFormData(p => ({ ...p, trip_end_date: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Driver Name *</Label>
              <Input
                placeholder="Enter driver name"
                value={formData.driver_name}
                onChange={(e) => setFormData(p => ({ ...p, driver_name: e.target.value }))}
                list="driver-suggestions"
              />
              <datalist id="driver-suggestions">
                {uniqueDrivers.map(d => <option key={d} value={d} />)}
              </datalist>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Time Out *</Label>
                <TimeSelect
                  value={formData.time_out}
                  onChange={(value) => setFormData(p => ({ ...p, time_out: value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Time In</Label>
                <TimeSelect
                  value={formData.time_in}
                  onChange={(value) => setFormData(p => ({ ...p, time_in: value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Trip Purpose</Label>
              <Input
                placeholder="e.g., Client meeting, Airport pickup"
                value={formData.trip_purpose}
                onChange={(e) => setFormData(p => ({ ...p, trip_purpose: e.target.value }))}
              />
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Odometer Start (km)</Label>
                <Input
                  type="number"
                  placeholder="Start reading"
                  value={formData.odometer_start}
                  onChange={(e) => setFormData(p => ({ ...p, odometer_start: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Odometer End (km)</Label>
                <Input
                  type="number"
                  placeholder="End reading"
                  value={formData.odometer_end}
                  onChange={(e) => setFormData(p => ({ ...p, odometer_end: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
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
              {isLoading ? 'Creating...' : 'Create Log'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Trip Log
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
                <Label>Trip Date *</Label>
                <Input
                  type="date"
                  value={formData.trip_date}
                  onChange={(e) => setFormData(p => ({ ...p, trip_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Trip End Date</Label>
              <Input
                type="date"
                value={formData.trip_end_date}
                min={formData.trip_date}
                onChange={(e) => setFormData(p => ({ ...p, trip_end_date: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Driver Name *</Label>
              <Input
                placeholder="Enter driver name"
                value={formData.driver_name}
                onChange={(e) => setFormData(p => ({ ...p, driver_name: e.target.value }))}
              />
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Time Out *</Label>
                <TimeSelect
                  value={formData.time_out}
                  onChange={(value) => setFormData(p => ({ ...p, time_out: value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Time In</Label>
                <TimeSelect
                  value={formData.time_in}
                  onChange={(value) => setFormData(p => ({ ...p, time_in: value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Trip Purpose</Label>
              <Input
                placeholder="e.g., Client meeting, Airport pickup"
                value={formData.trip_purpose}
                onChange={(e) => setFormData(p => ({ ...p, trip_purpose: e.target.value }))}
              />
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Odometer Start (km)</Label>
                <Input
                  type="number"
                  placeholder="Start reading"
                  value={formData.odometer_start}
                  onChange={(e) => setFormData(p => ({ ...p, odometer_start: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Odometer End (km)</Label>
                <Input
                  type="number"
                  placeholder="End reading"
                  value={formData.odometer_end}
                  onChange={(e) => setFormData(p => ({ ...p, odometer_end: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setEditingLog(null); resetForm() }}>
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

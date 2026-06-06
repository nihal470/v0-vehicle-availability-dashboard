'use client'

import { useState, useEffect } from 'react'
import { Vehicle, Location } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { PlayCircle, Car, MapPin, Plus, Check, X, Pencil } from 'lucide-react'
import { format } from 'date-fns'

interface Props {
  vehicle: Vehicle
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: 'start' | 'edit'
}

export function StartAgreementModal({ vehicle, open, onOpenChange, mode = 'start' }: Props) {
  const isEdit = mode === 'edit'
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [showAddLocation, setShowAddLocation] = useState(false)
  const [newLocationName, setNewLocationName] = useState('')
  const [isAddingLocation, setIsAddingLocation] = useState(false)
  const [formData, setFormData] = useState({
    customer_name: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    return_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    return_time: '',
    location_id: vehicle.location_id || '',
    expected_return_location: '',
    ag_no: '',
    rental_type: 'monthly' as 'daily' | 'monthly',
    rental_renewal_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    payment_status: 'not_paid' as 'paid' | 'not_paid',
    payment_date: '',
    total_rent: '',
    amount_paid: '',
    current_km: vehicle.current_km?.toString() || '',
  })

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      const { data } = await supabase.from('locations').select('*').order('name')
      if (data) setLocations(data)
    }
    if (open) fetchLocations()
  }, [open, supabase])

  const handleAddLocation = async () => {
    const name = newLocationName.trim()
    if (!name) return
    setIsAddingLocation(true)
    try {
      const { data, error } = await supabase
        .from('locations')
        .insert({ name })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setLocations((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
        // Auto-select the newly created location for current location
        setFormData((prev) => ({ ...prev, location_id: data.id }))
      }
      setNewLocationName('')
      setShowAddLocation(false)
    } catch (error) {
      console.error('Error adding location:', error)
      alert('Failed to add location. It may already exist.')
    } finally {
      setIsAddingLocation(false)
    }
  }

  // Reset form data when modal opens
  useEffect(() => {
    if (open) {
      setShowAddLocation(false)
      setNewLocationName('')
      const defaultReturn = format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
      setFormData({
        customer_name: isEdit ? (vehicle.customer_name || '') : '',
        start_date: isEdit ? (vehicle.start_date || format(new Date(), 'yyyy-MM-dd')) : format(new Date(), 'yyyy-MM-dd'),
        return_date: isEdit ? (vehicle.return_date || defaultReturn) : defaultReturn,
        return_time: isEdit ? (vehicle.return_time || '') : '',
        location_id: vehicle.location_id || '',
        expected_return_location: isEdit ? (vehicle.expected_return_location || '') : '',
        ag_no: isEdit ? (vehicle.ag_no || '') : '',
        rental_type: isEdit ? ((vehicle.rental_type as 'daily' | 'monthly') || 'monthly') : 'monthly',
        rental_renewal_date: isEdit ? (vehicle.rental_renewal_date || defaultReturn) : defaultReturn,
        payment_status: isEdit ? ((vehicle.payment_status as 'paid' | 'not_paid') || 'not_paid') : 'not_paid',
        payment_date: isEdit ? (vehicle.payment_date || '') : '',
        total_rent: isEdit ? (vehicle.total_rent?.toString() || '') : '',
        amount_paid: isEdit ? (vehicle.amount_paid?.toString() || '') : '',
        current_km: vehicle.current_km?.toString() || '',
      })
    }
  }, [vehicle, open, isEdit])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleStartAgreement = async () => {
    if (!formData.customer_name.trim()) {
      alert('Please enter customer name')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          status: isEdit ? vehicle.status : 'running',
          customer_name: formData.customer_name.trim(),
          start_date: formData.start_date || null,
          return_date: formData.return_date || null,
          return_time: formData.return_time || null,
          location_id: formData.location_id || null,
          expected_return_location: formData.expected_return_location.trim() || null,
          ag_no: formData.ag_no.trim() || null,
          rental_type: formData.rental_type,
          rental_renewal_date: formData.rental_renewal_date || null,
          payment_status: formData.payment_status,
          payment_date: formData.payment_date || null,
          total_rent: formData.total_rent ? parseFloat(formData.total_rent) : null,
          amount_paid: formData.amount_paid ? parseFloat(formData.amount_paid) : null,
          current_km: formData.current_km ? parseInt(formData.current_km) : vehicle.current_km,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vehicle.id)

      if (error) throw error

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error saving agreement:', error)
      alert('Failed to save agreement. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? (
              <Pencil className="h-5 w-5 text-blue-600" />
            ) : (
              <PlayCircle className="h-5 w-5 text-emerald-600" />
            )}
            {isEdit ? 'Edit Agreement' : 'Start Agreement'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the rental agreement details for this vehicle.'
              : 'Assign a customer to this vehicle and start the rental agreement.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Vehicle Info */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Car className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{vehicle.make} {vehicle.model}</p>
                  <p className="text-sm text-muted-foreground font-mono">{vehicle.license_plate}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="customer_name">Customer Name <span className="text-destructive">*</span></Label>
            <Input
              id="customer_name"
              placeholder="Enter customer name"
              value={formData.customer_name}
              onChange={(e) => handleInputChange('customer_name', e.target.value)}
            />
          </div>

          {/* Agreement Number */}
          <div className="space-y-2">
            <Label htmlFor="ag_no">Agreement Number (AG No)</Label>
            <Input
              id="ag_no"
              placeholder="e.g., 2140"
              value={formData.ag_no}
              onChange={(e) => handleInputChange('ag_no', e.target.value)}
            />
          </div>

          {/* Current Location */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="location_id" className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Current Location
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-primary hover:text-primary"
                onClick={() => setShowAddLocation((v) => !v)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Location
              </Button>
            </div>
            {showAddLocation ? (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  placeholder="New location name"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddLocation()
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  className="shrink-0 bg-emerald-600 hover:bg-emerald-700"
                  disabled={isAddingLocation || !newLocationName.trim()}
                  onClick={handleAddLocation}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => {
                    setShowAddLocation(false)
                    setNewLocationName('')
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Select
                value={formData.location_id}
                onValueChange={(value) => handleInputChange('location_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select current location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="start_date">Agreement Start Date</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => handleInputChange('start_date', e.target.value)}
            />
          </div>

          {/* Return Date & Time */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="return_date">Expected Return Date</Label>
              <Input
                id="return_date"
                type="date"
                value={formData.return_date}
                onChange={(e) => handleInputChange('return_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return_time">Expected Return Time</Label>
              <Input
                id="return_time"
                type="time"
                value={formData.return_time}
                onChange={(e) => handleInputChange('return_time', e.target.value)}
              />
            </div>
          </div>

          {/* Expected Return Location */}
          <div className="space-y-2">
            <Label htmlFor="expected_return_location" className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              Expected Return Location
            </Label>
            <Select
              value={formData.expected_return_location}
              onValueChange={(value) => handleInputChange('expected_return_location', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select expected return location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.name}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rental Type & Renewal Date */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rental_type">Rental Type</Label>
              <Select 
                value={formData.rental_type} 
                onValueChange={(value) => handleInputChange('rental_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select rental type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rental_renewal_date">Renewal Date</Label>
              <Input
                id="rental_renewal_date"
                type="date"
                value={formData.rental_renewal_date}
                onChange={(e) => handleInputChange('rental_renewal_date', e.target.value)}
              />
            </div>
          </div>

          {/* Payment Status & Date */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payment_status">Payment Status</Label>
              <Select 
                value={formData.payment_status} 
                onValueChange={(value) => handleInputChange('payment_status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">
                    <span className="text-emerald-600 font-medium">Paid</span>
                  </SelectItem>
                  <SelectItem value="not_paid">
                    <span className="text-red-600 font-medium">Not Paid</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_date">Payment Date</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => handleInputChange('payment_date', e.target.value)}
              />
            </div>
          </div>

          {/* Total Rent & Amount Paid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="total_rent">Total Rent (AED)</Label>
              <Input
                id="total_rent"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.total_rent}
                onChange={(e) => handleInputChange('total_rent', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount_paid">Amount Paid (AED)</Label>
              <Input
                id="amount_paid"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.amount_paid}
                onChange={(e) => handleInputChange('amount_paid', e.target.value)}
              />
            </div>
          </div>

          {/* Balance Due */}
          {(formData.total_rent || formData.amount_paid) && (
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
              <span className="text-sm font-medium text-muted-foreground">Balance Due</span>
              <span className={`text-sm font-semibold ${
                (parseFloat(formData.total_rent || '0') - parseFloat(formData.amount_paid || '0')) > 0
                  ? 'text-red-600'
                  : 'text-emerald-600'
              }`}>
                AED {(parseFloat(formData.total_rent || '0') - parseFloat(formData.amount_paid || '0')).toFixed(2)}
              </span>
            </div>
          )}

          {/* Current KM */}
          <div className="space-y-2">
            <Label htmlFor="current_km">Starting KM Reading</Label>
            <Input
              id="current_km"
              type="number"
              placeholder="Enter current odometer reading"
              value={formData.current_km}
              onChange={(e) => handleInputChange('current_km', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleStartAgreement} 
            disabled={isLoading || !formData.customer_name.trim()}
            className={isEdit ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}
          >
            {isLoading 
              ? (isEdit ? 'Saving...' : 'Starting...') 
              : (isEdit ? 'Save Changes' : 'Start Agreement')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

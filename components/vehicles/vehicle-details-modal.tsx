'use client'

import { useState, useEffect } from 'react'
import { Vehicle } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, FileText, Wrench, Gauge, Loader2, Car, Building2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'

interface Props {
  vehicle: Vehicle
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VehicleDetailsModal({ vehicle, open, onOpenChange }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    make: vehicle.make || '',
    model: vehicle.model || '',
    license_plate: vehicle.license_plate || '',
    ownership_type: vehicle.ownership_type || 'owned',
    insurance_start_date: vehicle.insurance_start_date || '',
    insurance_end_date: vehicle.insurance_end_date || '',
    mulkiya_renewal_date: vehicle.mulkiya_renewal_date || '',
    last_service_date: vehicle.last_service_date || '',
    last_service_km: vehicle.last_service_km?.toString() || '',
    current_km: vehicle.current_km?.toString() || '',
    next_service_km: vehicle.next_service_km?.toString() || '',
    next_service_date: vehicle.next_service_date || '',
  })

  // Reset form data when vehicle changes or modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        make: vehicle.make || '',
        model: vehicle.model || '',
        license_plate: vehicle.license_plate || '',
        ownership_type: vehicle.ownership_type || 'owned',
        insurance_start_date: vehicle.insurance_start_date || '',
        insurance_end_date: vehicle.insurance_end_date || '',
        mulkiya_renewal_date: vehicle.mulkiya_renewal_date || '',
        last_service_date: vehicle.last_service_date || '',
        last_service_km: vehicle.last_service_km?.toString() || '',
        current_km: vehicle.current_km?.toString() || '',
        next_service_km: vehicle.next_service_km?.toString() || '',
        next_service_date: vehicle.next_service_date || '',
      })
    }
  }, [vehicle, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()

    const { error } = await supabase
      .from('vehicles')
      .update({
        make: formData.make,
        model: formData.model,
        license_plate: formData.license_plate,
        ownership_type: formData.ownership_type,
        insurance_start_date: formData.insurance_start_date || null,
        insurance_end_date: formData.insurance_end_date || null,
        mulkiya_renewal_date: formData.mulkiya_renewal_date || null,
        last_service_date: formData.last_service_date || null,
        last_service_km: formData.last_service_km ? parseInt(formData.last_service_km) : null,
        current_km: formData.current_km ? parseInt(formData.current_km) : null,
        next_service_km: formData.next_service_km ? parseInt(formData.next_service_km) : null,
        next_service_date: formData.next_service_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vehicle.id)

    setIsLoading(false)

    if (error) {
      alert('Error updating vehicle: ' + error.message)
    } else {
      router.refresh()
      onOpenChange(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Calculate remaining KM
  const currentKm = parseInt(formData.current_km) || 0
  const nextServiceKm = parseInt(formData.next_service_km) || 0
  const remainingKm = nextServiceKm - currentKm

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{vehicle.make} {vehicle.model}</span>
            <span className="text-muted-foreground font-normal">({vehicle.license_plate})</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vehicle Information Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Car className="h-4 w-4 text-primary" />
                Vehicle Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="make">Make</Label>
                  <Input
                    id="make"
                    type="text"
                    placeholder="e.g., Honda"
                    value={formData.make}
                    onChange={(e) => handleInputChange('make', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    type="text"
                    placeholder="e.g., City"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="license_plate">License Plate</Label>
                  <Input
                    id="license_plate"
                    type="text"
                    placeholder="e.g., 1234 AB"
                    value={formData.license_plate}
                    onChange={(e) => handleInputChange('license_plate', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownership_type">Ownership Type</Label>
                <Select 
                  value={formData.ownership_type} 
                  onValueChange={(value) => handleInputChange('ownership_type', value)}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Select ownership" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owned">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-emerald-600" />
                        Owned
                      </div>
                    </SelectItem>
                    <SelectItem value="leased">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        Leased
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Insurance Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-primary" />
                Car Insurance
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="insurance_start_date">Insurance Start Date</Label>
                <Input
                  id="insurance_start_date"
                  type="date"
                  value={formData.insurance_start_date}
                  onChange={(e) => handleInputChange('insurance_start_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insurance_end_date">Insurance End Date</Label>
                <Input
                  id="insurance_end_date"
                  type="date"
                  value={formData.insurance_end_date}
                  onChange={(e) => handleInputChange('insurance_end_date', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Mulkiya Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                Mulkiya (Registration)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="mulkiya_renewal_date">Mulkiya Renewal Date</Label>
                <Input
                  id="mulkiya_renewal_date"
                  type="date"
                  value={formData.mulkiya_renewal_date}
                  onChange={(e) => handleInputChange('mulkiya_renewal_date', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Service Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="h-4 w-4 text-primary" />
                Service Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="last_service_date">Last Service Date</Label>
                  <Input
                    id="last_service_date"
                    type="date"
                    value={formData.last_service_date}
                    onChange={(e) => handleInputChange('last_service_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_service_km">Last Service KM</Label>
                  <Input
                    id="last_service_km"
                    type="number"
                    placeholder="e.g., 40000"
                    value={formData.last_service_km}
                    onChange={(e) => handleInputChange('last_service_km', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="next_service_date">Next Service Due (Date)</Label>
                <Input
                  id="next_service_date"
                  type="date"
                  value={formData.next_service_date}
                  onChange={(e) => handleInputChange('next_service_date', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Kilometers Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Gauge className="h-4 w-4 text-primary" />
                Kilometer Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="current_km">Current Running KM</Label>
                  <Input
                    id="current_km"
                    type="number"
                    placeholder="e.g., 45000"
                    value={formData.current_km}
                    onChange={(e) => handleInputChange('current_km', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="next_service_km">Next Service Due (KM)</Label>
                  <Input
                    id="next_service_km"
                    type="number"
                    placeholder="e.g., 50000"
                    value={formData.next_service_km}
                    onChange={(e) => handleInputChange('next_service_km', e.target.value)}
                  />
                </div>
              </div>

              {/* Remaining KM Display */}
              {formData.current_km && formData.next_service_km && (
                <div className={`p-4 rounded-lg border ${
                  remainingKm < 0 
                    ? 'bg-destructive/10 border-destructive/50' 
                    : remainingKm <= 1000 
                      ? 'bg-amber-500/10 border-amber-500/50' 
                      : 'bg-green-500/10 border-green-500/50'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Remaining KM for Next Service:</span>
                    <span className={`text-lg font-bold ${
                      remainingKm < 0 
                        ? 'text-destructive' 
                        : remainingKm <= 1000 
                          ? 'text-amber-600' 
                          : 'text-green-600'
                    }`}>
                      {remainingKm > 0 
                        ? `${remainingKm.toLocaleString()} km` 
                        : `Overdue by ${Math.abs(remainingKm).toLocaleString()} km`
                      }
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

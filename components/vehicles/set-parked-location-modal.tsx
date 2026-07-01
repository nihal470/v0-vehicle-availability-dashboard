'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { MapPin, Car, Plane, Building2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Vehicle } from '@/lib/types'

interface Props {
  vehicle: Vehicle
  open: boolean
  onOpenChange: (open: boolean) => void
}

const parkedLocationOptions = [
  { value: 'car_wash', label: 'Car Wash', icon: Car },
  { value: 'airport', label: 'Airport', icon: Plane },
  { value: 'office_front', label: 'Office Front', icon: Building2 },
  { value: 'custom', label: 'Custom Location', icon: MapPin },
]

export function SetParkedLocationModal({ vehicle, open, onOpenChange }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [parkedLocation, setParkedLocation] = useState<string>('')
  const [parkedLocationCustom, setParkedLocationCustom] = useState('')

  // Pre-fill with the vehicle's existing parked location when opened
  useEffect(() => {
    if (open) {
      setParkedLocation(vehicle.parked_location || '')
      setParkedLocationCustom(vehicle.parked_location_custom || '')
    }
  }, [open, vehicle])

  const handleSubmit = async () => {
    setIsLoading(true)

    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          parked_location: parkedLocation || null,
          parked_location_custom: parkedLocation === 'custom' ? parkedLocationCustom : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vehicle.id)

      if (error) throw error

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error setting parked location:', error)
      alert('Failed to set parked location. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Parked Location</DialogTitle>
          <DialogDescription>
            Set where {vehicle.make} {vehicle.model} ({vehicle.license_plate}) is parked
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2 text-amber-700">
            <MapPin className="h-4 w-4" />
            <Label className="font-medium">Parked Location</Label>
          </div>
          <Select value={parkedLocation} onValueChange={setParkedLocation}>
            <SelectTrigger>
              <SelectValue placeholder="Select parked location" />
            </SelectTrigger>
            <SelectContent>
              {parkedLocationOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <option.icon className="h-4 w-4" />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {parkedLocation === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="customLocation">Custom Location</Label>
              <Input
                id="customLocation"
                placeholder="Enter custom location..."
                value={parkedLocationCustom}
                onChange={(e) => setParkedLocationCustom(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !parkedLocation || (parkedLocation === 'custom' && !parkedLocationCustom.trim())}
          >
            {isLoading ? 'Saving...' : 'Save Location'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

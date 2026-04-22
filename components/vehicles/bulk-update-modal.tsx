'use client'

import { useState } from 'react'
import { Vehicle } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FileText, Loader2, CheckSquare, Square } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

interface BulkUpdateModalProps {
  vehicles: Vehicle[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BulkUpdateModal({ vehicles, open, onOpenChange }: BulkUpdateModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([])
  const [mulkiyaDate, setMulkiyaDate] = useState('')

  const handleSelectAll = () => {
    if (selectedVehicles.length === vehicles.length) {
      setSelectedVehicles([])
    } else {
      setSelectedVehicles(vehicles.map(v => v.id))
    }
  }

  const handleSelectVehicle = (vehicleId: string) => {
    setSelectedVehicles(prev => 
      prev.includes(vehicleId) 
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedVehicles.length === 0 || !mulkiyaDate) {
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          mulkiya_renewal_date: mulkiyaDate,
          updated_at: new Date().toISOString(),
        })
        .in('id', selectedVehicles)

      if (error) throw error

      router.refresh()
      onOpenChange(false)
      setSelectedVehicles([])
      setMulkiyaDate('')
    } catch (error) {
      console.error('Failed to update vehicles:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Bulk Update Mulkiya Renewal
          </DialogTitle>
          <DialogDescription>
            Select vehicles and set a new Mulkiya renewal date for all selected vehicles.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Date Input */}
          <div className="space-y-2 mb-4">
            <Label htmlFor="mulkiya_date" className="text-base font-medium">
              New Mulkiya Renewal Date
            </Label>
            <Input
              id="mulkiya_date"
              type="date"
              value={mulkiyaDate}
              onChange={(e) => setMulkiyaDate(e.target.value)}
              required
              className="w-full sm:w-[250px]"
            />
          </div>

          {/* Vehicle Selection */}
          <div className="flex-1 overflow-hidden border rounded-lg">
            {/* Select All Header */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 border-b sticky top-0">
              <Checkbox
                id="select-all"
                checked={selectedVehicles.length === vehicles.length && vehicles.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all" className="font-medium cursor-pointer">
                Select All ({selectedVehicles.length}/{vehicles.length} selected)
              </Label>
            </div>

            {/* Vehicle List */}
            <div className="overflow-y-auto max-h-[300px]">
              {vehicles.map((vehicle) => (
                <div 
                  key={vehicle.id} 
                  className={`flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/30 cursor-pointer ${
                    selectedVehicles.includes(vehicle.id) ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => handleSelectVehicle(vehicle.id)}
                >
                  <Checkbox
                    checked={selectedVehicles.includes(vehicle.id)}
                    onCheckedChange={() => handleSelectVehicle(vehicle.id)}
                  />
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div>
                      <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                      <p className="text-sm text-muted-foreground font-mono">{vehicle.license_plate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Mulkiya</p>
                      <p className="text-sm">
                        {vehicle.mulkiya_renewal_date 
                          ? format(new Date(vehicle.mulkiya_renewal_date), 'dd-MMM-yyyy')
                          : 'Not set'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="text-sm capitalize">{vehicle.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || selectedVehicles.length === 0 || !mulkiyaDate}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  Update {selectedVehicles.length} Vehicle{selectedVehicles.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

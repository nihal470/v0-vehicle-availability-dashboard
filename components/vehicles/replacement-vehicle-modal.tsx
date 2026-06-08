'use client'

import { useState, useMemo } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Replace, Clock, ArrowRightLeft, Car, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import type { Vehicle } from '@/lib/types'

interface Props {
  vehicle: Vehicle
  vehicles: Vehicle[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReplacementVehicleModal({ vehicle, vehicles, open, onOpenChange }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [replacementType, setReplacementType] = useState<'temporary' | 'permanent'>('temporary')
  const [replacementVehicleId, setReplacementVehicleId] = useState('')
  const [notes, setNotes] = useState('')
  const [replacementDate, setReplacementDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  // Pool: idle, reserved (available), garage — and not the vehicle itself
  const availableVehicles = useMemo(
    () =>
      vehicles.filter(
        (v) =>
          v.id !== vehicle.id &&
          ['idle', 'available', 'garage'].includes(v.status)
      ),
    [vehicles, vehicle.id]
  )

  const selectedReplacement = availableVehicles.find((v) => v.id === replacementVehicleId)

  const handleSubmit = async () => {
    if (!replacementVehicleId) return
    setIsLoading(true)

    try {
      if (replacementType === 'temporary') {
        // Keep agreement on original, just log the replacement link
        const { error } = await supabase
          .from('vehicles')
          .update({
            replacement_vehicle_id: replacementVehicleId,
            replacement_type: 'temporary',
            replacement_notes: notes || null,
            replacement_date: replacementDate || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', vehicle.id)

        if (error) throw error
      } else {
        // Permanent: transfer agreement to the replacement, return the original
        const { error: replacementError } = await supabase
          .from('vehicles')
          .update({
            status: 'running',
            customer_name: vehicle.customer_name,
            start_date: vehicle.start_date,
            return_date: vehicle.return_date,
            return_time: vehicle.return_time,
            expected_return_location: vehicle.expected_return_location,
            ag_no: vehicle.ag_no,
            rental_type: vehicle.rental_type,
            rental_renewal_date: vehicle.rental_renewal_date,
            payment_status: vehicle.payment_status,
            payment_date: vehicle.payment_date,
            total_rent: vehicle.total_rent,
            amount_paid: vehicle.amount_paid,
            location_id: vehicle.location_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', replacementVehicleId)

        if (replacementError) throw replacementError

        // Return the original and clear its agreement + replacement link
        const { error: originalError } = await supabase
          .from('vehicles')
          .update({
            status: 'returned',
            customer_name: null,
            start_date: null,
            return_date: null,
            return_time: null,
            expected_return_location: null,
            ag_no: null,
            rental_type: null,
            rental_renewal_date: null,
            payment_status: null,
            payment_date: null,
            total_rent: null,
            amount_paid: null,
            replacement_vehicle_id: replacementVehicleId,
            replacement_type: 'permanent',
            replacement_notes: notes || null,
            replacement_date: replacementDate || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', vehicle.id)

        if (originalError) throw originalError
      }

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error assigning replacement vehicle:', error)
      alert('Failed to assign replacement vehicle. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Replace className="h-5 w-5 text-orange-600" />
            Replacement Vehicle
          </DialogTitle>
          <DialogDescription>
            Assign a replacement for {vehicle.make} {vehicle.model} ({vehicle.license_plate})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Original vehicle / customer */}
          <div className="rounded-lg border bg-muted/50 p-3 text-sm">
            <p className="text-muted-foreground">Current Agreement</p>
            <p className="font-medium">
              {vehicle.customer_name || 'No customer'}
              {vehicle.ag_no ? ` · AG ${vehicle.ag_no}` : ''}
            </p>
          </div>

          {/* Replacement type */}
          <div className="space-y-3">
            <Label>Replacement Type</Label>
            <RadioGroup
              value={replacementType}
              onValueChange={(v) => setReplacementType(v as 'temporary' | 'permanent')}
              className="grid gap-3"
            >
              <div className="relative">
                <RadioGroupItem value="temporary" id="temporary" className="peer sr-only" />
                <Label
                  htmlFor="temporary"
                  className="flex items-center gap-3 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium">Temporary (For Service)</p>
                    <p className="text-sm text-muted-foreground">
                      Agreement stays on this vehicle; replacement is logged
                    </p>
                  </div>
                </Label>
              </div>
              <div className="relative">
                <RadioGroupItem value="permanent" id="permanent" className="peer sr-only" />
                <Label
                  htmlFor="permanent"
                  className="flex items-center gap-3 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <ArrowRightLeft className="h-5 w-5 text-orange-600" />
                  <div className="flex-1">
                    <p className="font-medium">Permanent</p>
                    <p className="text-sm text-muted-foreground">
                      Transfer agreement to replacement; return this vehicle
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Replacement vehicle picker */}
          <div className="space-y-2">
            <Label htmlFor="replacement">Replacement Vehicle</Label>
            {availableVehicles.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                No available vehicles (idle, reserved, or garage) to assign.
              </div>
            ) : (
              <Select value={replacementVehicleId} onValueChange={setReplacementVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {availableVehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        {v.make} {v.model} ({v.license_plate}) · {v.status}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Replacement date */}
          <div className="space-y-2">
            <Label htmlFor="replacement_date">Replacement Date</Label>
            <Input
              id="replacement_date"
              type="date"
              value={replacementDate}
              onChange={(e) => setReplacementDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Original vehicle sent for service / accident repair..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Permanent warning */}
          {replacementType === 'permanent' && selectedReplacement && (
            <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                The agreement will be moved to {selectedReplacement.make} {selectedReplacement.model}, and{' '}
                {vehicle.make} {vehicle.model} will be marked as Returned.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !replacementVehicleId}
            className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700"
          >
            {isLoading ? 'Assigning...' : 'Assign Replacement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
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
import { Warehouse, Wrench, PauseCircle, CheckCircle2 } from 'lucide-react'
import type { Vehicle } from '@/lib/types'

interface Props {
  vehicle: Vehicle
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MoveVehicleModal({ vehicle, open, onOpenChange }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string>('garage')
  const [reason, setReason] = useState('')
  const [estimatedDate, setEstimatedDate] = useState('')

  const statusOptions = [
    {
      value: 'garage',
      label: 'In Garage',
      description: 'Vehicle is parked in the garage',
      icon: Warehouse,
      color: 'text-slate-600',
    },
    {
      value: 'maintenance',
      label: 'Service / Maintenance',
      description: 'Vehicle is under service or repair',
      icon: Wrench,
      color: 'text-purple-600',
    },
    {
      value: 'idle',
      label: 'Idle',
      description: 'Vehicle is idle and waiting',
      icon: PauseCircle,
      color: 'text-amber-600',
    },
    {
      value: 'available',
      label: 'Reserved',
      description: 'Reserved for upcoming bookings',
      icon: CheckCircle2,
      color: 'text-sky-600',
    },
  ]

  const handleSubmit = async () => {
    setIsLoading(true)

    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          status: selectedStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vehicle.id)

      if (error) throw error

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error moving vehicle:', error)
      alert('Failed to move vehicle. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move Vehicle</DialogTitle>
          <DialogDescription>
            Change status for {vehicle.make} {vehicle.model} ({vehicle.license_plate})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Status */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">Current Status</p>
            <p className="font-medium capitalize">{vehicle.status}</p>
          </div>

          {/* Status Selection */}
          <div className="space-y-3">
            <Label>Move to</Label>
            <RadioGroup
              value={selectedStatus}
              onValueChange={setSelectedStatus}
              className="grid gap-3"
            >
              {statusOptions.map((option) => (
                <div key={option.value} className="relative">
                  <RadioGroupItem
                    value={option.value}
                    id={option.value}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={option.value}
                    className="flex items-center gap-3 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <option.icon className={`h-5 w-5 ${option.color}`} />
                    <div className="flex-1">
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Reason (optional) */}
          {(selectedStatus === 'garage' || selectedStatus === 'maintenance') && (
            <>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="e.g., Oil change, tire replacement, parking..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                />
              </div>

              {selectedStatus === 'maintenance' && (
                <div className="space-y-2">
                  <Label htmlFor="estimatedDate">Estimated Completion Date</Label>
                  <Input
                    id="estimatedDate"
                    type="date"
                    value={estimatedDate}
                    onChange={(e) => setEstimatedDate(e.target.value)}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || selectedStatus === vehicle.status}
          >
            {isLoading ? 'Moving...' : 'Move Vehicle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

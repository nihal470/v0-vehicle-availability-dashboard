'use client'

import { useState, useEffect } from 'react'
import { Vehicle, Branch, BRANCHES } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowRightLeft, ArrowRight, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  vehicle: Vehicle
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TransferVehicleModal({ vehicle, open, onOpenChange }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [fromBranch, setFromBranch] = useState<Branch>(vehicle.branch)
  const [toBranch, setToBranch] = useState<Branch>(
    vehicle.branch === 'Muscat' ? 'Salalah' : 'Muscat'
  )
  const [notes, setNotes] = useState('')

  // Reset when opening / vehicle changes
  useEffect(() => {
    if (open) {
      setFromBranch(vehicle.branch)
      setToBranch(vehicle.branch === 'Muscat' ? 'Salalah' : 'Muscat')
      setNotes('')
    }
  }, [vehicle, open])

  // Keep destination different from source
  const handleFromChange = (value: Branch) => {
    setFromBranch(value)
    if (value === toBranch) {
      setToBranch(value === 'Muscat' ? 'Salalah' : 'Muscat')
    }
  }

  const handleToChange = (value: Branch) => {
    setToBranch(value)
    if (value === fromBranch) {
      setFromBranch(value === 'Muscat' ? 'Salalah' : 'Muscat')
    }
  }

  const handleTransfer = async () => {
    if (fromBranch === toBranch) {
      alert('Source and destination branches must be different.')
      return
    }

    setIsLoading(true)
    const supabase = createClient()
    try {
      // Update the vehicle's current branch and increment transfer count
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({
          branch: toBranch,
          transfer_count: (vehicle.transfer_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vehicle.id)

      if (updateError) throw updateError

      // Log the transfer in history
      const { error: logError } = await supabase.from('vehicle_transfers').insert({
        vehicle_id: vehicle.id,
        from_branch: fromBranch,
        to_branch: toBranch,
        notes: notes.trim() || null,
      })

      if (logError) throw logError

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error transferring vehicle:', error)
      alert('Failed to transfer vehicle. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-blue-600" />
            Transfer Vehicle
          </DialogTitle>
          <DialogDescription>
            Move {vehicle.make} {vehicle.model} ({vehicle.license_plate}) between branches.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Source & Destination */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div className="space-y-2">
              <Label htmlFor="from_branch">From Branch</Label>
              <Select value={fromBranch} onValueChange={(v) => handleFromChange(v as Branch)}>
                <SelectTrigger id="from_branch">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRANCHES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex h-10 items-center justify-center text-muted-foreground">
              <ArrowRight className="h-5 w-5" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="to_branch">To Branch</Label>
              <Select value={toBranch} onValueChange={(v) => handleToChange(v as Branch)}>
                <SelectTrigger id="to_branch">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRANCHES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Current branch note */}
          <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            Currently at <span className="font-medium text-foreground">{vehicle.branch}</span>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Reason for transfer, driver, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={isLoading || fromBranch === toBranch}
            className="w-full bg-blue-600 hover:bg-blue-700 sm:w-auto"
          >
            {isLoading ? 'Transferring...' : 'Confirm Transfer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

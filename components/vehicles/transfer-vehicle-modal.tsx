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
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowRight, Building, MapPin, Repeat } from 'lucide-react'
import { BRANCHES, type Branch, type Vehicle } from '@/lib/types'

interface Props {
  vehicle: Vehicle
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TransferVehicleModal({ vehicle, open, onOpenChange }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const sourceBranch = (vehicle.branch || 'Muscat') as Branch
  const defaultDestination = BRANCHES.find((b) => b !== sourceBranch) ?? 'Salalah'
  const [destinationBranch, setDestinationBranch] = useState<Branch>(defaultDestination)
  const [notes, setNotes] = useState('')

  // Reset destination whenever the modal is opened for a (possibly different) vehicle
  useEffect(() => {
    if (open) {
      const dest = BRANCHES.find((b) => b !== (vehicle.branch || 'Muscat')) ?? 'Salalah'
      setDestinationBranch(dest as Branch)
      setNotes('')
    }
  }, [open, vehicle.branch])

  const handleTransfer = async () => {
    if (destinationBranch === sourceBranch) {
      alert('Please select a different destination branch.')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          branch: destinationBranch,
          transfer_count: (vehicle.transfer_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vehicle.id)

      if (error) throw error

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
            <Repeat className="h-5 w-5 text-primary" />
            Transfer Vehicle
          </DialogTitle>
          <DialogDescription>
            Move {vehicle.make} {vehicle.model} ({vehicle.license_plate}) between branches.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Source -> Destination visual */}
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 p-4">
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-xs text-muted-foreground">From</span>
              <div className="flex items-center gap-1.5 font-semibold">
                <Building className="h-4 w-4 text-slate-600" />
                {sourceBranch}
              </div>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-primary" />
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-xs text-muted-foreground">To</span>
              <div className="flex items-center gap-1.5 font-semibold text-primary">
                <MapPin className="h-4 w-4" />
                {destinationBranch}
              </div>
            </div>
          </div>

          {/* Source branch (read-only) */}
          <div className="space-y-2">
            <Label>Source Branch</Label>
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm font-medium">
              <Building className="h-4 w-4 text-slate-600" />
              {sourceBranch}
            </div>
          </div>

          {/* Destination branch */}
          <div className="space-y-2">
            <Label htmlFor="destination_branch">Destination Branch</Label>
            <Select value={destinationBranch} onValueChange={(v) => setDestinationBranch(v as Branch)}>
              <SelectTrigger id="destination_branch">
                <SelectValue placeholder="Select destination branch" />
              </SelectTrigger>
              <SelectContent>
                {BRANCHES.map((branch) => (
                  <SelectItem key={branch} value={branch} disabled={branch === sourceBranch}>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {branch}
                      {branch === sourceBranch && (
                        <span className="text-xs text-muted-foreground">(current)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="transfer_notes">Notes (Optional)</Label>
            <Textarea
              id="transfer_notes"
              placeholder="e.g., Reassigned for Salalah branch demand..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="w-full sm:w-auto"
            onClick={handleTransfer}
            disabled={isLoading || destinationBranch === sourceBranch}
          >
            {isLoading ? 'Transferring...' : `Confirm Transfer to ${destinationBranch}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

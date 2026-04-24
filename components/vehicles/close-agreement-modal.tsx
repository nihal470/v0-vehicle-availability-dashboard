'use client'

import { useState } from 'react'
import { Vehicle } from '@/lib/types'
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
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Car, User, Calendar, FileText } from 'lucide-react'
import { format } from 'date-fns'

interface Props {
  vehicle: Vehicle
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CloseAgreementModal({ vehicle, open, onOpenChange }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [actualReturnDate, setActualReturnDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [newStatus, setNewStatus] = useState<string>('idle')
  const [finalKm, setFinalKm] = useState(vehicle.current_km?.toString() || '')

  const handleCloseAgreement = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          status: newStatus,
          customer_name: null,
          return_date: null,
          ag_no: null,
          rental_type: null,
          current_km: finalKm ? parseInt(finalKm) : vehicle.current_km,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vehicle.id)

      if (error) throw error

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error closing agreement:', error)
      alert('Failed to close agreement. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Close Agreement
          </DialogTitle>
          <DialogDescription>
            Complete the rental agreement and return the vehicle to the fleet.
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

          {/* Current Agreement Info */}
          {vehicle.customer_name && (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-medium">{vehicle.customer_name}</span>
              </div>
              {vehicle.ag_no && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Agreement No:</span>
                  <Badge variant="outline">{vehicle.ag_no}</Badge>
                </div>
              )}
              {vehicle.return_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Expected Return:</span>
                  <span>{format(new Date(vehicle.return_date), 'dd-MMM-yyyy')}</span>
                </div>
              )}
            </div>
          )}

          {/* Actual Return Date */}
          <div className="space-y-2">
            <Label htmlFor="actualReturnDate">Actual Return Date</Label>
            <Input
              id="actualReturnDate"
              type="date"
              value={actualReturnDate}
              onChange={(e) => setActualReturnDate(e.target.value)}
            />
          </div>

          {/* Final KM Reading */}
          <div className="space-y-2">
            <Label htmlFor="finalKm">Final KM Reading</Label>
            <Input
              id="finalKm"
              type="number"
              placeholder="Enter final odometer reading"
              value={finalKm}
              onChange={(e) => setFinalKm(e.target.value)}
            />
            {vehicle.current_km && (
              <p className="text-xs text-muted-foreground">
                Previous reading: {vehicle.current_km.toLocaleString()} km
              </p>
            )}
          </div>

          {/* New Status */}
          <div className="space-y-2">
            <Label htmlFor="newStatus">Vehicle Status After Return</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="idle">Idle - Ready for next rental</SelectItem>
                <SelectItem value="available">Reserved - For upcoming booking</SelectItem>
                <SelectItem value="maintenance">Maintenance - Needs service</SelectItem>
                <SelectItem value="garage">Garage - In storage</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCloseAgreement} 
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Closing...' : 'Close Agreement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

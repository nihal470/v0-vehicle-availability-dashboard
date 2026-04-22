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
import { CreditCard, Car, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'

interface Props {
  vehicle: Vehicle
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UpdatePaymentModal({ vehicle, open, onOpenChange }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    rental_renewal_date: vehicle.rental_renewal_date || format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    payment_status: vehicle.payment_status || 'not_paid',
    payment_date: vehicle.payment_date || '',
    return_date: vehicle.return_date || '',
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }
      
      // Automatically update return_date when rental_renewal_date is changed
      if (field === 'rental_renewal_date' && value) {
        updated.return_date = value
      }
      
      return updated
    })
  }

  const handleUpdate = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          rental_renewal_date: formData.rental_renewal_date || null,
          payment_status: formData.payment_status,
          payment_date: formData.payment_date || null,
          return_date: formData.return_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vehicle.id)

      if (error) throw error

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error updating payment:', error)
      alert('Failed to update payment. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Update Rental & Payment
          </DialogTitle>
          <DialogDescription>
            Update renewal date and payment status for this rental.
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
                  {vehicle.customer_name && (
                    <p className="text-sm text-primary font-medium">{vehicle.customer_name}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Renewal Date - Primary field that auto-updates return date */}
          <div className="space-y-2">
            <Label htmlFor="rental_renewal_date" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Monthly Renewal Date
            </Label>
            <Input
              id="rental_renewal_date"
              type="date"
              value={formData.rental_renewal_date}
              onChange={(e) => handleInputChange('rental_renewal_date', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Return date will be updated automatically</p>
          </div>

          {/* Return Date - Auto-synced with renewal date */}
          <div className="space-y-2">
            <Label htmlFor="return_date">Return Date</Label>
            <Input
              id="return_date"
              type="date"
              value={formData.return_date}
              onChange={(e) => handleInputChange('return_date', e.target.value)}
              className="bg-muted/30"
            />
          </div>

          {/* Payment Status */}
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

          {/* Payment Date */}
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

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

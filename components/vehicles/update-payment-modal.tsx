'use client'

import { useState, useEffect } from 'react'
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
import { Card, CardContent } from '@/components/ui/card'
import { RefreshCw, Car, ArrowRight, Calendar } from 'lucide-react'
import { format, addDays } from 'date-fns'

interface Props {
  vehicle: Vehicle
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UpdatePaymentModal({ vehicle, open, onOpenChange }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)

  // Calculate new agreement dates
  // New agreement starts from the day after current return date
  const currentReturnDate = vehicle.return_date ? new Date(vehicle.return_date) : new Date()
  const newStartDate = addDays(currentReturnDate, 1)
  const newEndDate = addDays(newStartDate, 30)

  const [formData, setFormData] = useState({
    // New agreement dates
    new_return_date: format(newEndDate, 'yyyy-MM-dd'),
    new_renewal_date: format(newEndDate, 'yyyy-MM-dd'),
    // Customer info (can be updated)
    customer_name: vehicle.customer_name || '',
    ag_no: vehicle.ag_no || '',
    // Payment for new agreement
    payment_date: '',
    amount_paid: '',
  })

  // Reset form data when vehicle changes or modal opens
  useEffect(() => {
    if (open) {
      const currentReturnDate = vehicle.return_date ? new Date(vehicle.return_date) : new Date()
      const newStartDate = addDays(currentReturnDate, 1)
      const newEndDate = addDays(newStartDate, 30)
      
      setFormData({
        new_return_date: format(newEndDate, 'yyyy-MM-dd'),
        new_renewal_date: format(newEndDate, 'yyyy-MM-dd'),
        customer_name: vehicle.customer_name || '',
        ag_no: vehicle.ag_no || '',
        payment_date: '',
        amount_paid: '',
      })
    }
  }, [vehicle, open])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleRenew = async () => {
    if (!formData.customer_name.trim()) {
      alert('Please enter customer name')
      return
    }

    setIsLoading(true)
    try {
      // Update vehicle with new agreement details
      const { error } = await supabase
        .from('vehicles')
        .update({
          // Keep running status
          status: 'running',
          // Update customer info
          customer_name: formData.customer_name.trim(),
          ag_no: formData.ag_no.trim() || null,
          // New agreement dates
          return_date: formData.new_return_date,
          rental_renewal_date: formData.new_renewal_date,
          // Record payment for new agreement
          payment_date: formData.payment_date || null,
          amount_paid: formData.amount_paid ? parseFloat(formData.amount_paid) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vehicle.id)

      if (error) throw error

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error renewing agreement:', error)
      alert('Failed to renew agreement. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Renew Agreement
          </DialogTitle>
          <DialogDescription>
            Close current agreement and start a new 30-day agreement from the next day.
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

          {/* Current vs New Agreement Info */}
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Current Return</p>
                  <p className="font-semibold text-amber-600">
                    {vehicle.return_date ? format(new Date(vehicle.return_date), 'dd-MMM-yy') : 'Not set'}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">New Start</p>
                  <p className="font-semibold text-emerald-600">
                    {format(newStartDate, 'dd-MMM-yy')}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">New Return</p>
                  <p className="font-semibold text-primary">
                    {format(newEndDate, 'dd-MMM-yy')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Customer Name</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => handleInputChange('customer_name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ag_no">Agreement No</Label>
              <Input
                id="ag_no"
                value={formData.ag_no}
                onChange={(e) => handleInputChange('ag_no', e.target.value)}
              />
            </div>
          </div>

          {/* New Agreement Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new_return_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                New Return Date
              </Label>
              <Input
                id="new_return_date"
                type="date"
                value={formData.new_return_date}
                onChange={(e) => {
                  handleInputChange('new_return_date', e.target.value)
                  handleInputChange('new_renewal_date', e.target.value)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_renewal_date">Renewal Date</Label>
              <Input
                id="new_renewal_date"
                type="date"
                value={formData.new_renewal_date}
                onChange={(e) => handleInputChange('new_renewal_date', e.target.value)}
              />
            </div>
          </div>

          {/* Payment */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payment_date">Payment Date</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => handleInputChange('payment_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount_paid">Amount Paid (OMR)</Label>
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
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleRenew} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
            {isLoading ? 'Renewing...' : 'Renew Agreement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

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
import { PlayCircle, Car } from 'lucide-react'
import { format } from 'date-fns'

interface Props {
  vehicle: Vehicle
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StartAgreementModal({ vehicle, open, onOpenChange }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    customer_name: '',
    return_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    ag_no: '',
    rental_type: 'monthly' as 'daily' | 'monthly',
    rental_renewal_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    payment_status: 'not_paid' as 'paid' | 'not_paid',
    payment_date: '',
    current_km: vehicle.current_km?.toString() || '',
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleStartAgreement = async () => {
    if (!formData.customer_name.trim()) {
      alert('Please enter customer name')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          status: 'running',
          customer_name: formData.customer_name.trim(),
          return_date: formData.return_date || null,
          ag_no: formData.ag_no.trim() || null,
          rental_type: formData.rental_type,
          rental_renewal_date: formData.rental_renewal_date || null,
          payment_status: formData.payment_status,
          payment_date: formData.payment_date || null,
          current_km: formData.current_km ? parseInt(formData.current_km) : vehicle.current_km,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vehicle.id)

      if (error) throw error

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error starting agreement:', error)
      alert('Failed to start agreement. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-emerald-600" />
            Start Agreement
          </DialogTitle>
          <DialogDescription>
            Assign a customer to this vehicle and start the rental agreement.
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

          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="customer_name">Customer Name <span className="text-destructive">*</span></Label>
            <Input
              id="customer_name"
              placeholder="Enter customer name"
              value={formData.customer_name}
              onChange={(e) => handleInputChange('customer_name', e.target.value)}
            />
          </div>

          {/* Agreement Number */}
          <div className="space-y-2">
            <Label htmlFor="ag_no">Agreement Number (AG No)</Label>
            <Input
              id="ag_no"
              placeholder="e.g., 2140"
              value={formData.ag_no}
              onChange={(e) => handleInputChange('ag_no', e.target.value)}
            />
          </div>

          {/* Return Date */}
          <div className="space-y-2">
            <Label htmlFor="return_date">Expected Return Date</Label>
            <Input
              id="return_date"
              type="date"
              value={formData.return_date}
              onChange={(e) => handleInputChange('return_date', e.target.value)}
            />
          </div>

          {/* Rental Type & Renewal Date */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rental_type">Rental Type</Label>
              <Select 
                value={formData.rental_type} 
                onValueChange={(value) => handleInputChange('rental_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select rental type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rental_renewal_date">Renewal Date</Label>
              <Input
                id="rental_renewal_date"
                type="date"
                value={formData.rental_renewal_date}
                onChange={(e) => handleInputChange('rental_renewal_date', e.target.value)}
              />
            </div>
          </div>

          {/* Payment Status & Date */}
          <div className="grid gap-4 sm:grid-cols-2">
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

          {/* Current KM */}
          <div className="space-y-2">
            <Label htmlFor="current_km">Starting KM Reading</Label>
            <Input
              id="current_km"
              type="number"
              placeholder="Enter current odometer reading"
              value={formData.current_km}
              onChange={(e) => handleInputChange('current_km', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleStartAgreement} 
            disabled={isLoading || !formData.customer_name.trim()}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? 'Starting...' : 'Start Agreement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

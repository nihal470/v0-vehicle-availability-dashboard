'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Vehicle, Location, VehicleBooking } from '@/lib/types'

interface BookingFormProps {
  vehicles: (Vehicle & { category: { name: string } | null })[]
  locations: Location[]
  onBookingCreated: (booking: VehicleBooking & { vehicle: Vehicle & { category: { name: string } | null } }) => void
  onCancel: () => void
}

export default function BookingForm({
  vehicles,
  locations,
  onBookingCreated,
  onCancel,
}: BookingFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    vehicle_id: '',
    customer_name: '',
    customer_phone: '',
    airline: '',
    flight_number: '',
    flight_arrival_time: '',
    flight_departure_time: '',
    start_date: '',
    start_time: '09:00',
    end_date: '',
    end_time: '09:00',
    pickup_location_id: '',
    dropoff_location_id: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validation
    if (!formData.vehicle_id) {
      setError('Please select a vehicle')
      setIsLoading(false)
      return
    }

    if (!formData.start_date || !formData.end_date || !formData.start_time || !formData.end_time) {
      setError('Please select pickup and return dates and times')
      setIsLoading(false)
      return
    }

    const pickupAt = new Date(`${formData.start_date}T${formData.start_time}:00Z`)
    const returnAt = new Date(`${formData.end_date}T${formData.end_time}:00Z`)
    if (returnAt <= pickupAt) {
      setError('Return time must be after pickup time')
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    try {
      const { data, error: insertError } = await supabase.rpc('create_vehicle_booking', {
        p_vehicle_id: formData.vehicle_id,
        p_pickup_at: pickupAt.toISOString(),
        p_return_at: returnAt.toISOString(),
        p_status: 'booked',
        p_customer_name: formData.customer_name || null,
        p_customer_phone: formData.customer_phone || null,
        p_notes: formData.notes || null,
      })

      if (insertError) throw new Error(insertError.message.includes('already booked') ? 'This vehicle is already booked for the selected time.' : insertError.message)

      const selectedVehicle = vehicles.find((vehicle) => vehicle.id === formData.vehicle_id)
      onBookingCreated({ ...data, vehicle: selectedVehicle } as VehicleBooking & { vehicle: Vehicle & { category: { name: string } | null } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking')
    } finally {
      setIsLoading(false)
    }
  }

  // Group vehicles by category
  const vehiclesByCategory = vehicles.reduce(
    (acc, vehicle) => {
      const categoryName = vehicle.category?.name || 'Uncategorized'
      if (!acc[categoryName]) {
        acc[categoryName] = []
      }
      acc[categoryName].push(vehicle)
      return acc
    },
    {} as Record<string, typeof vehicles>
  )

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
      {/* Vehicle Selection */}
      <div className="grid gap-2">
        <Label htmlFor="vehicle">Vehicle *</Label>
        <Select
          value={formData.vehicle_id}
          onValueChange={(value) =>
            setFormData({ ...formData, vehicle_id: value })
          }
        >
          <SelectTrigger id="vehicle">
            <SelectValue placeholder="Select a vehicle" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(vehiclesByCategory).map(([category, categoryVehicles]) => (
              <div key={category}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {category}
                </div>
                {categoryVehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.make} {vehicle.model} - {vehicle.license_plate}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Customer Name */}
      <div className="grid gap-2">
        <Label htmlFor="customer_name">Customer Name</Label>
        <Input
          id="customer_name"
          placeholder="Enter customer name"
          value={formData.customer_name}
          onChange={(e) =>
            setFormData({ ...formData, customer_name: e.target.value })
          }
        />
      </div>

      {/* Customer Phone */}
      <div className="grid gap-2">
        <Label htmlFor="customer_phone">Customer Phone</Label>
        <Input
          id="customer_phone"
          type="tel"
          placeholder="+974 XXXX XXXX"
          value={formData.customer_phone}
          onChange={(e) =>
            setFormData({ ...formData, customer_phone: e.target.value })
          }
        />
      </div>

      <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 md:col-span-2 md:grid-cols-2">
        <div className="md:col-span-2"><p className="text-sm font-semibold">Flight details <span className="font-normal text-muted-foreground">(optional)</span></p><p className="text-xs text-muted-foreground">Useful for airport pickup or arrival coordination.</p></div>
        <div className="grid gap-2"><Label htmlFor="airline">Airline</Label><Input id="airline" placeholder="e.g. Oman Air" value={formData.airline} onChange={(e) => setFormData({ ...formData, airline: e.target.value })} /></div>
        <div className="grid gap-2"><Label htmlFor="flight_number">Flight number</Label><Input id="flight_number" placeholder="e.g. WY101" value={formData.flight_number} onChange={(e) => setFormData({ ...formData, flight_number: e.target.value })} /></div>
        <div className="grid gap-2"><Label htmlFor="flight_arrival_time">Arrival time</Label><Input id="flight_arrival_time" type="time" value={formData.flight_arrival_time} onChange={(e) => setFormData({ ...formData, flight_arrival_time: e.target.value })} /></div>
        <div className="grid gap-2"><Label htmlFor="flight_departure_time">Departure time</Label><Input id="flight_departure_time" type="time" value={formData.flight_departure_time} onChange={(e) => setFormData({ ...formData, flight_departure_time: e.target.value })} /></div>
      </div>

      {/* Start Date */}
      <div className="grid gap-2">
        <Label htmlFor="start_date">Start Date *</Label>
        <Input
          id="start_date"
          type="date"
          value={formData.start_date}
          onChange={(e) =>
            setFormData({ ...formData, start_date: e.target.value })
          }
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="start_time">Pickup Time *</Label>
        <Input id="start_time" type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} required />
      </div>

      {/* End Date */}
      <div className="grid gap-2">
        <Label htmlFor="end_date">Return Date *</Label>
        <Input
          id="end_date"
          type="date"
          value={formData.end_date}
          onChange={(e) =>
            setFormData({ ...formData, end_date: e.target.value })
          }
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="end_time">Return Time *</Label>
        <Input id="end_time" type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} required />
      </div>

      {/* Pickup Location */}
      <div className="grid gap-2">
        <Label htmlFor="pickup_location">Pickup Location</Label>
        <Select
          value={formData.pickup_location_id}
          onValueChange={(value) =>
            setFormData({ ...formData, pickup_location_id: value === '__not_provided' ? '' : value })
          }
        >
          <SelectTrigger id="pickup_location">
            <SelectValue placeholder="Select pickup location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__not_provided">Not provided</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dropoff Location */}
      <div className="grid gap-2">
        <Label htmlFor="dropoff_location">Dropoff Location</Label>
        <Select
          value={formData.dropoff_location_id}
          onValueChange={(value) =>
            setFormData({ ...formData, dropoff_location_id: value })
          }
        >
          <SelectTrigger id="dropoff_location">
            <SelectValue placeholder="Select dropoff location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__not_provided">Not provided</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="grid gap-2 md:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Any additional notes about this booking..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive md:col-span-2">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 md:col-span-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Booking'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

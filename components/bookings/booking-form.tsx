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

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === formData.vehicle_id)
  const durationDays = formData.start_date && formData.end_date ? Math.max(0, Math.ceil((new Date(`${formData.end_date}T12:00:00`).getTime() - new Date(`${formData.start_date}T12:00:00`).getTime()) / 86400000)) : 0

  return (
    <form onSubmit={handleSubmit} className="overflow-hidden rounded-xl border bg-background shadow-sm">
      <header className="border-b px-5 py-4 sm:px-8">
        <div className="flex items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">TravZ Fleet</p><h2 className="text-xl font-semibold tracking-tight">New Booking</h2></div><button type="button" onClick={onCancel} aria-label="Close booking form" className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground">×</button></div>
        <div className="mt-6 flex items-start justify-between gap-2 overflow-x-auto pb-1">
          {['Booking Details', 'Select Vehicle', 'Customer Details', 'Pricing & Extras', 'Payment', 'Review & Confirm'].map((step, index) => <div key={step} className="flex min-w-[92px] flex-1 items-start gap-2"><div className="flex flex-1 flex-col items-center gap-2"><span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${index === 0 ? 'bg-sky-500 text-white ring-4 ring-sky-100' : 'bg-muted text-muted-foreground'}`}>{index + 1}</span><span className={`text-center text-xs ${index === 0 ? 'font-medium text-sky-600' : 'text-muted-foreground'}`}>{step}</span></div>{index < 5 && <span className="mt-5 h-px min-w-8 flex-1 border-t border-dashed border-muted-foreground/40" />}</div>)}
        </div>
      </header>
      <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_348px]">
        <section><h3 className="mb-5 text-lg font-semibold">Booking Details</h3><div className="grid gap-5 sm:grid-cols-2">
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

      <div className="flex flex-wrap gap-3 pt-2 sm:col-span-2">
        <Button type="submit" disabled={isLoading}>{isLoading ? 'Creating...' : 'Create Booking'}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
        </div></section>
        <aside className="space-y-4">
          <div className="rounded-xl border-2 border-dashed border-sky-200 bg-sky-50/70 p-5"><div className="flex items-center gap-2 text-sm font-medium text-slate-600"><span className="text-lg">◷</span> Total Duration</div><p className="mt-2 text-3xl font-bold text-indigo-600">{durationDays} Days</p><p className="mt-1 text-xs text-muted-foreground">Pickup: {formData.start_date || '----'} · Drop: {formData.end_date || '----'}</p></div>
          <div className="rounded-xl border-2 border-dashed p-5"><h3 className="font-semibold">Price Details</h3><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Base Price ({durationDays} days)</span><span>₹0</span></div><div className="flex justify-between"><span className="text-muted-foreground">Extras</span><span>₹0</span></div><div className="flex justify-between"><span className="text-muted-foreground">GST (18%)</span><span>₹0</span></div><div className="flex justify-between border-t border-dashed pt-4 font-bold"><span>Total Amount</span><span className="text-lg text-sky-500">₹0</span></div></div></div>
          <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/70 p-5"><p className="font-medium text-emerald-700">Security Deposit</p><p className="mt-2 text-xl font-bold text-emerald-600">₹5,000</p><p className="mt-1 text-xs text-emerald-700/80">Refundable after return</p></div>
          <div className="rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/60 p-5"><p className="text-xs font-medium uppercase tracking-wide text-violet-600">Current Step</p><p className="mt-1 font-semibold">Booking Details</p>{selectedVehicle && <p className="mt-2 text-sm text-muted-foreground">{selectedVehicle.make} {selectedVehicle.model}</p>}</div>
        </aside>
      </div>
    </form>
  )
}

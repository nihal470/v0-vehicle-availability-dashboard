'use client'

import { useEffect, useState } from 'react'
import { UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TimeSelect } from '@/components/ui/time-select'
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
  customers: { id: string; name: string; mobile: string | null; email: string | null }[]
  onBookingCreated: (booking: VehicleBooking & { vehicle: Vehicle & { category: { name: string } | null } }) => void
  onCancel: () => void
}

export default function BookingForm({
  vehicles,
  locations,
  customers,
  onBookingCreated,
  onCancel,
}: BookingFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<number>(1)
  const [vehicleType, setVehicleType] = useState('all')
  const [datePreset, setDatePreset] = useState<'today' | 'tomorrow' | 'custom'>('today')
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing')
  const [rentalType, setRentalType] = useState('daily')
  const [extras, setExtras] = useState<string[]>([])
  const [paymentMethod, setPaymentMethod] = useState('pay_later')
  const [availableVehicles, setAvailableVehicles] = useState<typeof vehicles>(vehicles)
  const [error, setError] = useState<string | null>(null)
  const toDateInput = (date: Date) => date.toISOString().slice(0, 10)
  const today = toDateInput(new Date())
  const tomorrow = toDateInput(new Date(Date.now() + 24 * 60 * 60 * 1000))

  const [formData, setFormData] = useState({
    vehicle_id: '',
    customer_name: '',
    customer_phone: '',
    airline: '',
    flight_number: '',
    flight_arrival_time: '',
    flight_departure_time: '',
    start_date: toDateInput(new Date()),
    start_time: '09:00',
    end_date: toDateInput(new Date(Date.now() + 24 * 60 * 60 * 1000)),
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

  const categories = Array.from(new Set(vehicles.map((vehicle) => vehicle.category?.name).filter(Boolean))) as string[]

  useEffect(() => {
    if (!formData.start_date || !formData.end_date || !formData.start_time || !formData.end_time) return
    const pickupAt = new Date(`${formData.start_date}T${formData.start_time}:00Z`).toISOString()
    const returnAt = new Date(`${formData.end_date}T${formData.end_time}:00Z`).toISOString()
    const refreshAvailability = async () => {
      const supabase = createClient()
      const { data: conflicts } = await supabase.from('vehicle_bookings').select('vehicle_id').not('status', 'in', '(cancelled,completed)').lt('pickup_at', returnAt).gt('return_at', pickupAt)
      const blockedIds = new Set((conflicts ?? []).map((booking) => booking.vehicle_id))
      setAvailableVehicles(vehicles.filter((vehicle) => !blockedIds.has(vehicle.id) && (vehicleType === 'all' || vehicle.category?.name === vehicleType) && !['maintenance', 'garage', 'archived', 'inactive'].includes(vehicle.status)))
    }
    void refreshAvailability()
  }, [formData.start_date, formData.end_date, formData.start_time, formData.end_time, vehicleType, vehicles])

  // Group vehicles by category
  const vehiclesByCategory = availableVehicles.reduce(
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
          {['Booking Details', 'Select Vehicle', 'Customer Details', 'Pricing & Extras', 'Payment', 'Review & Confirm'].map((stepName, index) => <div key={stepName} className="flex min-w-[92px] flex-1 items-start gap-2"><div className="flex flex-1 flex-col items-center gap-2"><span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${index < step - 1 ? 'bg-emerald-500 text-white' : index === step - 1 ? 'bg-sky-500 text-white ring-4 ring-sky-100' : 'bg-muted text-muted-foreground'}`}>{index < step - 1 ? '✓' : index + 1}</span><span className={`text-center text-xs ${index === step - 1 ? 'font-medium text-sky-600' : 'text-muted-foreground'}`}>{stepName}</span></div>{index < 5 && <span className="mt-5 h-px min-w-8 flex-1 border-t border-dashed border-muted-foreground/40" />}</div>)}
        </div>
      </header>
      <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_348px]">
        <section><h3 className="mb-5 text-lg font-semibold">{['Booking Details', 'Select Vehicle', 'Customer Details', 'Pricing & Extras', 'Payment', 'Review & Confirm'][step - 1]}</h3><div className="grid gap-5 sm:grid-cols-2">
      {step === 2 && <>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="vehicle_type">Vehicle Type *</Label>
        <Select value={vehicleType} onValueChange={(value) => { setVehicleType(value); setFormData({ ...formData, vehicle_id: '' }) }}>
          <SelectTrigger id="vehicle_type"><SelectValue placeholder="Select vehicle type" /></SelectTrigger>
          <SelectContent>{categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid gap-2 sm:col-span-2"><Label htmlFor="vehicle">Available Vehicle *</Label><Select value={formData.vehicle_id} onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}><SelectTrigger id="vehicle"><SelectValue placeholder={`${availableVehicles.length} vehicles available`} /></SelectTrigger><SelectContent>{Object.entries(vehiclesByCategory).map(([category, categoryVehicles]) => <div key={category}><div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{category}</div>{categoryVehicles.map((vehicle) => <SelectItem key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model} - {vehicle.license_plate}</SelectItem>)}</div>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Showing vehicles available for the selected pickup and return period.</p></div></>}

      {step === 3 && (
        <>
          <div className="grid gap-2 sm:col-span-2"><p className="text-sm font-semibold">Customer Details</p></div>
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
            <button type="button" onClick={() => setCustomerMode('existing')} className={`rounded-xl border-2 p-5 text-center transition ${customerMode === 'existing' ? 'border-sky-500 bg-sky-50/70' : 'border-dashed border-muted hover:border-sky-300'}`}>
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600"><UserRound className="h-5 w-5" /></span><span className="mt-3 block font-medium">Existing Customer</span><span className="mt-1 block text-xs text-muted-foreground">Select from records</span>
            </button>
            <button type="button" onClick={() => { setCustomerMode('new'); setFormData({ ...formData, customer_name: '', customer_phone: '' }) }} className={`rounded-xl border-2 p-5 text-center transition ${customerMode === 'new' ? 'border-sky-500 bg-sky-50/70' : 'border-dashed border-muted hover:border-sky-300'}`}>
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><UserRound className="h-5 w-5" /></span><span className="mt-3 block font-medium">New Customer</span><span className="mt-1 block text-xs text-muted-foreground">Add new record</span>
            </button>
          </div>
          {customerMode === 'existing' ? (
            <div className="grid gap-2 sm:col-span-2"><Label htmlFor="customer_record">Select Customer</Label><Select value={customers.some((customer) => customer.name === formData.customer_name) ? formData.customer_name : ''} onValueChange={(value) => { const customer = customers.find((item) => item.name === value); setFormData({ ...formData, customer_name: customer?.name ?? '', customer_phone: customer?.mobile ?? '' }) }}><SelectTrigger id="customer_record"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{customers.map((customer) => <SelectItem key={customer.id} value={customer.name}>{customer.name}{customer.mobile ? ` — ${customer.mobile}` : ''}</SelectItem>)}</SelectContent></Select></div>
          ) : (
            <div className="grid gap-5 sm:col-span-2 sm:grid-cols-2">
              <div className="grid gap-2"><Label htmlFor="customer_name">Customer Name</Label><Input id="customer_name" placeholder="Enter customer name" value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} /></div>
              <div className="grid gap-2"><Label htmlFor="customer_phone">Customer Phone</Label><Input id="customer_phone" type="tel" placeholder="+974 XXXX XXXX" value={formData.customer_phone} onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })} /></div>
            </div>
          )}
        </>
      )}


      {step === 1 && <>
      <div className="grid gap-3 sm:col-span-2"><Label>Rental dates</Label><div className="flex flex-wrap gap-2">{[['today', 'Today'], ['tomorrow', 'Tomorrow'], ['custom', 'Custom']].map(([value, label]) => <Button key={value} type="button" size="sm" variant={datePreset === value ? 'default' : 'outline'} onClick={() => { setDatePreset(value as 'today' | 'tomorrow' | 'custom'); if (value !== 'custom') setFormData((current) => ({ ...current, start_date: value === 'today' ? today : tomorrow, end_date: value === 'today' ? tomorrow : toDateInput(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)) })) }}>{label}</Button>)}</div>{datePreset !== 'custom' && <p className="text-xs text-muted-foreground">{formData.start_date} to {formData.end_date}</p>}</div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="rental_type">Rental Type</Label>
        <Select value={rentalType} onValueChange={setRentalType}>
          <SelectTrigger id="rental_type"><SelectValue placeholder="Select rental type" /></SelectTrigger>
          <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent>
        </Select>
      </div>
      {/* Start Date */}
      <div className="grid gap-2">
        <Label htmlFor="start_date">Start Date *</Label>
        <Input
          id="start_date"
          type="date"
          value={formData.start_date}
          onChange={(e) => {
            setDatePreset('custom')
            setFormData({ ...formData, start_date: e.target.value, end_date: formData.end_date || e.target.value })
          }}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="start_time">Pickup Time *</Label>
        <TimeSelect id="start_time" value={formData.start_time} onChange={(value) => setFormData({ ...formData, start_time: value })} placeholder="Select pickup time" />
      </div>

      {/* End Date */}
      <div className="grid gap-2">
        <Label htmlFor="end_date">Return Date *</Label>
        <Input
          id="end_date"
          type="date"
          min={formData.start_date || undefined}
          value={formData.end_date}
          onChange={(e) => {
            setDatePreset('custom')
            setFormData({ ...formData, end_date: e.target.value < formData.start_date ? formData.start_date : e.target.value })
          }}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="end_time">Return Time *</Label>
        <TimeSelect id="end_time" value={formData.end_time} onChange={(value) => setFormData({ ...formData, end_time: value })} placeholder="Select return time" />
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
      </>}

      {step === 4 && <div className="grid gap-4 sm:col-span-2"><div className="rounded-xl border bg-muted/20 p-4"><p className="font-medium">Base rental</p><div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">{durationDays} day{durationDays === 1 ? '' : 's'} × Daily rate</span><span>₹0</span></div></div><fieldset className="grid gap-3"><legend className="text-sm font-semibold">Extras</legend>{['Additional driver', 'Child seat', 'GPS navigation'].map((extra) => <label key={extra} className="flex items-center gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" checked={extras.includes(extra)} onChange={(event) => setExtras((current) => event.target.checked ? [...current, extra] : current.filter((item) => item !== extra))} />{extra}<span className="ml-auto text-muted-foreground">₹0</span></label>)}</fieldset></div>}

      {step === 5 && <div className="grid gap-3 sm:col-span-2"><p className="text-sm font-semibold">Payment method</p>{[['pay_later', 'Pay later'], ['cash', 'Cash'], ['card', 'Card']].map(([value, label]) => <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${paymentMethod === value ? 'border-primary bg-primary/5' : ''}`}><input type="radio" name="payment_method" value={value} checked={paymentMethod === value} onChange={(event) => setPaymentMethod(event.target.value)} /><span>{label}</span></label>)}</div>}

      {step === 6 && <div className="grid gap-4 sm:col-span-2"><div className="rounded-xl border bg-muted/20 p-4"><h4 className="font-semibold">Booking summary</h4><dl className="mt-3 grid gap-2 text-sm"><div className="flex justify-between"><dt className="text-muted-foreground">Vehicle</dt><dd>{selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : 'Not selected'}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Customer</dt><dd>{formData.customer_name || 'Not selected'}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Rental period</dt><dd>{formData.start_date} to {formData.end_date}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Payment</dt><dd>{paymentMethod === 'pay_later' ? 'Pay later' : paymentMethod}</dd></div></dl></div><p className="text-sm text-muted-foreground">Review the details before creating this booking.</p></div>}

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive md:col-span-2">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2 sm:col-span-2">
        {step === 1 ? <Button type="button" onClick={() => { if (!formData.start_date || !formData.end_date || !formData.start_time || !formData.end_time) { setError('Please select pickup and return dates and times'); return } if (new Date(`${formData.end_date}T${formData.end_time}:00Z`) <= new Date(`${formData.start_date}T${formData.start_time}:00Z`)) { setError('Return time must be after pickup time'); return } setError(null); setStep(2) }}>Next: Select Vehicle</Button> : step === 2 ? <><Button type="button" disabled={!formData.vehicle_id} onClick={() => { if (!formData.vehicle_id) { setError('Please select an available vehicle'); return } setError(null); setStep(3) }}>Next: Customer Details</Button><Button type="button" variant="outline" onClick={() => setStep(1)}>Previous</Button></> : step === 3 ? <><Button type="button" onClick={() => { if (!formData.customer_name) { setError('Please select or enter a customer'); return } setError(null); setStep(4) }}>Next: Pricing & Extras</Button><Button type="button" variant="outline" onClick={() => setStep(2)}>Previous</Button></> : step === 4 ? <><Button type="button" onClick={() => { setError(null); setStep(5) }}>Next: Payment</Button><Button type="button" variant="outline" onClick={() => setStep(3)}>Previous</Button></> : step === 5 ? <><Button type="button" onClick={() => { setError(null); setStep(6) }}>Next: Review & Confirm</Button><Button type="button" variant="outline" onClick={() => setStep(4)}>Previous</Button></> : <><Button type="submit" disabled={isLoading}>{isLoading ? 'Creating...' : 'Create Booking'}</Button><Button type="button" variant="outline" onClick={() => setStep(5)}>Previous</Button></>}
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
        </div>
        </section>
        <aside className="space-y-4">
          <div className="rounded-xl border-2 border-dashed border-sky-200 bg-sky-50/70 p-5"><div className="flex items-center gap-2 text-sm font-medium text-slate-600"><span className="text-lg">◷</span> Total Duration</div><p className="mt-2 text-3xl font-bold text-indigo-600">{durationDays} Days</p><p className="mt-1 text-xs text-muted-foreground">Pickup: {formData.start_date || '----'} · Drop: {formData.end_date || '----'}</p></div>
          <div className="rounded-xl border-2 border-dashed p-5"><h3 className="font-semibold">Price Details</h3><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Base Price ({durationDays} days)</span><span>₹0</span></div><div className="flex justify-between"><span className="text-muted-foreground">Extras</span><span>₹0</span></div><div className="flex justify-between"><span className="text-muted-foreground">GST (18%)</span><span>₹0</span></div><div className="flex justify-between border-t border-dashed pt-4 font-bold"><span>Total Amount</span><span className="text-lg text-sky-500">₹0</span></div></div></div>
          <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/70 p-5"><p className="font-medium text-emerald-700">Security Deposit</p><p className="mt-2 text-xl font-bold text-emerald-600">₹5,000</p><p className="mt-1 text-xs text-emerald-700/80">Refundable after return</p></div>
          <div className="rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/60 p-5"><p className="text-xs font-medium uppercase tracking-wide text-violet-600">Current Step</p><p className="mt-1 font-semibold">{['Booking Details', 'Select Vehicle', 'Customer Details', 'Pricing & Extras', 'Payment', 'Review & Confirm'][step - 1]}</p>{selectedVehicle && <p className="mt-2 text-sm text-muted-foreground">{selectedVehicle.make} {selectedVehicle.model}</p>}</div>
        </aside>
      </div>
    </form>
  )
}

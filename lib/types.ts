export type VehicleStatus = 'available' | 'running' | 'idle' | 'garage' | 'maintenance'
export type BookingStatus = 'booked' | 'completed' | 'cancelled'

export interface Location {
  id: string
  name: string
  address: string | null
  created_at: string
}

export interface VehicleCategory {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface Vehicle {
  id: string
  category_id: string | null
  make: string
  model: string
  license_plate: string
  year: number | null
  color: string | null
  status: VehicleStatus
  location_id: string | null
  created_at: string
  updated_at: string
  category?: VehicleCategory
  location?: Location
}

export interface VehicleBooking {
  id: string
  vehicle_id: string
  start_date: string
  end_date: string
  status: BookingStatus
  customer_name: string | null
  customer_phone: string | null
  pickup_location_id: string | null
  dropoff_location_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  vehicle?: Vehicle
}

export interface VehicleWithBookings extends Vehicle {
  bookings: VehicleBooking[]
}

export interface CategoryWithVehicles extends VehicleCategory {
  vehicles: VehicleWithBookings[]
}

export interface FleetStats {
  totalVehicles: number
  runningVehicles: number
  idleVehicles: number
  inGarage: number
  available: number
}

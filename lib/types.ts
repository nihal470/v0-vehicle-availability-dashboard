export type VehicleStatus = 'available' | 'running' | 'idle' | 'garage' | 'maintenance' | 'returned'
export type BookingStatus = 'booked' | 'completed' | 'cancelled'
export type Branch = 'Muscat' | 'Salalah'
export const BRANCHES: Branch[] = ['Muscat', 'Salalah']

export interface VehicleTransfer {
  id: string
  vehicle_id: string
  from_branch: string
  to_branch: string
  notes: string | null
  transferred_at: string
  vehicle?: Vehicle
}

export type InspectionType = 'checkout' | 'checkin'

export interface InspectionPhoto {
  id: string
  vehicle_id: string
  ag_no: string | null
  customer_name: string | null
  inspection_type: InspectionType
  storage_path: string
  public_url: string
  file_name: string | null
  mime_type: string | null
  file_size: number | null
  width: number | null
  height: number | null
  captured_at: string
  gps_latitude: number | null
  gps_longitude: number | null
  gps_accuracy: number | null
  user_id: string | null
  user_email: string | null
  notes: string | null
  created_at: string
}

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
  // Tracking fields
  insurance_start_date: string | null
  insurance_end_date: string | null
  mulkiya_renewal_date: string | null
  last_service_date: string | null
  last_service_km: number | null
  current_km: number | null
  next_service_km: number | null
  next_service_date: string | null
  // Rental fields
  customer_name: string | null
  start_date: string | null
  return_date: string | null
  return_time: string | null
  expected_return_location: string | null
  ag_no: string | null
  rental_type: 'daily' | 'monthly' | null
  rental_renewal_date: string | null
  payment_status: 'paid' | 'not_paid' | null
  payment_date: string | null
  total_rent: number | null
  amount_paid: number | null
  // Branch
  branch: Branch
  transfer_count: number | null
  // Ownership
  ownership_type: 'owned' | 'leased' | null
  // Parked location for idle vehicles
  parked_location: 'car_wash' | 'airport' | 'office_front' | 'custom' | null
  parked_location_custom: string | null
  parked_location_photo: string | null
  parked_location_photo_path: string | null
  // Replacement vehicle (for service)
  replacement_vehicle_id: string | null
  replacement_type: 'temporary' | 'permanent' | null
  replacement_notes: string | null
  replacement_date: string | null
  replacement_vehicle?: Vehicle | null
  category?: VehicleCategory
  location?: Location
}

export interface VehicleAlert {
  vehicleId: string
  licensePlate: string
  make: string
  model: string
  type: 'insurance' | 'mulkiya' | 'service_km' | 'service_date'
  severity: 'critical' | 'warning' | 'info'
  message: string
  daysRemaining?: number
  kmRemaining?: number
}

// Trip Log for driver usage tracking
export interface TripLog {
  id: string
  vehicle_id: string
  trip_date: string
  trip_end_date: string | null
  driver_name: string
  time_out: string
  time_in: string | null
  trip_purpose: string | null
  odometer_start: number | null
  odometer_end: number | null
  notes: string | null
  created_at: string
  updated_at: string
  vehicle?: Vehicle
}

// Vehicle Fine/Violation tracking
export type FinePaymentStatus = 'paid' | 'unpaid' | 'pending'

export interface VehicleFine {
  id: string
  fine_reference: string | null
  vehicle_id: string
  trip_log_id: string | null
  fine_date: string
  fine_time: string | null
  driver_name: string | null
  fine_type: string
  fine_description: string | null
  fine_amount: number
  payment_status: FinePaymentStatus
  payment_date: string | null
  payment_reference: string | null
  location: string | null
  notes: string | null
  created_at: string
  updated_at: string
  vehicle?: Vehicle
  trip_log?: TripLog
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
  // Pickup details
  pickup_location: string | null
  pickup_time: string | null
  pickup_date: string | null
  pickup_notes: string | null
  // Dropoff details
  dropoff_location: string | null
  dropoff_time: string | null
  dropoff_date: string | null
  dropoff_notes: string | null
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
  maintenance: number
}

// Payment types
export type PaymentMode = 'cash' | 'cheque' | 'bank_transfer' | 'card' | 'online'

export interface Payment {
  id: string
  receipt_no: string
  receipt_date: string
  branch_name: string | null
  customer_name: string
  customer_address: string | null
  customer_phone: string | null
  debitor_code: string | null
  payment_mode: PaymentMode
  currency: string
  vehicle_id: string | null
  booking_id: string | null
  agreement_no: string | null
  total_amount: number
  remarks: string | null
  cheque_no: string | null
  reference_no: string | null
  reference_date: string | null
  bank_name: string | null
  received_by: string | null
  created_at: string
  updated_at: string
  vehicle?: Vehicle
  booking?: VehicleBooking
  items?: PaymentItem[]
}

export interface PaymentItem {
  id: string
  payment_id: string
  invoice_no: string | null
  ra_no: string | null
  vehicle_reg_no: string | null
  description: string | null
  amount: number
  created_at: string
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Car, Plus, LogOut, Home, Calendar, Trash2, FileCheck } from 'lucide-react'
import Link from 'next/link'
import BookingForm from './booking-form'
import type { Vehicle, Location, VehicleBooking } from '@/lib/types'

interface BookingWithVehicle extends VehicleBooking {
  vehicle: Vehicle & {
    category: { name: string } | null
  }
}

interface BookingsDashboardProps {
  vehicles: (Vehicle & { category: { name: string } | null })[]
  locations: Location[]
  customers: { id: string; name: string; mobile: string | null; email: string | null }[]
  bookings: BookingWithVehicle[]
  userEmail: string
}

export default function BookingsDashboard({
  vehicles,
  locations,
  customers,
  bookings: initialBookings,
  userEmail,
}: BookingsDashboardProps) {
  const [showForm, setShowForm] = useState(false)
  const [bookings, setBookings] = useState(initialBookings)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const refreshBookings = async () => {
      const { data } = await supabase.from('vehicle_bookings').select('*, vehicle:vehicles(*, category:vehicle_categories(*))').order('created_at', { ascending: false })
      if (data) setBookings(data as BookingWithVehicle[])
    }
    const channel = supabase.channel('bookings-dashboard-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_bookings' }, refreshBookings).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const handleBookingCreated = (newBooking: BookingWithVehicle) => {
    setBookings([newBooking, ...bookings])
    setShowForm(false)
  }

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to delete this booking?')) return

    setIsLoading(true)
    const supabase = createClient()
    
    const { error } = await supabase
      .from('vehicle_bookings')
      .delete()
      .eq('id', bookingId)

    if (!error) {
      setBookings(bookings.filter((b) => b.id !== bookingId))
    }
    setIsLoading(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'booked':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Car className="h-7 w-7" />
            <span className="text-xl font-bold">Fleet Manager</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm sm:inline">{userEmail}</span>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Bookings</h1>
            <p className="mt-1 text-muted-foreground">
              Manage vehicle reservations and bookings
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="lg">
            {showForm ? (
              'Cancel'
            ) : (
              <>
                <Plus className="mr-2 h-5 w-5" />
                New Booking
              </>
            )}
          </Button>
        </div>

        {/* Booking Form */}
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Create New Booking
              </CardTitle>
              <CardDescription>
                Fill in the details to create a new vehicle booking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BookingForm
                vehicles={vehicles}
                locations={locations}
                customers={customers}
                onBookingCreated={handleBookingCreated}
                onCancel={() => setShowForm(false)}
              />
            </CardContent>
          </Card>
        )}

        {/* Bookings Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Bookings</CardTitle>
            <CardDescription>
              {bookings.length} booking{bookings.length !== 1 ? 's' : ''} total
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-medium">No bookings yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create your first booking to get started
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {booking.vehicle?.make} {booking.vehicle?.model}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {booking.vehicle?.license_plate}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {booking.customer_name || 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {booking.customer_phone || 'No phone'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(booking.start_date)}</TableCell>
                        <TableCell>{formatDate(booking.end_date)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getStatusColor(booking.status)}
                          >
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild title="View confirmation">
                            <Link href={`/bookings/${booking.id}/confirmation`}><FileCheck className="h-4 w-4" /></Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteBooking(booking.id)}
                            disabled={isLoading}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

'use client'

import { useState, useMemo, useCallback } from 'react'
import { ChevronDown, ChevronUp, Car, ChevronLeft, ChevronRight, Plus, X, Calendar, User, Clock } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, isBefore, isAfter, addDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { CategoryWithVehicles, VehicleBooking, VehicleWithBookings } from '@/lib/types'

interface BookingCalendarProps {
  categories: CategoryWithVehicles[]
  locations?: { id: string; name: string }[]
}

type BookingInfo = {
  booking: VehicleBooking
  isStart: boolean
  isEnd: boolean
  isMiddle: boolean
}

function getBookingForDate(date: Date, bookings: VehicleBooking[]): BookingInfo | null {
  for (const booking of bookings) {
    if (booking.status === 'cancelled') continue
    const start = new Date(booking.start_date)
    const end = new Date(booking.end_date)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    
    if (date >= start && date <= end) {
      return {
        booking,
        isStart: isSameDay(date, start),
        isEnd: isSameDay(date, end),
        isMiddle: !isSameDay(date, start) && !isSameDay(date, end),
      }
    }
  }
  return null
}

function getCellStatus(
  vehicle: VehicleWithBookings,
  date: Date,
  selectedRange: { start: Date | null; end: Date | null },
  hoverDate: Date | null
): 'booked' | 'unavailable' | 'available' | 'selected' | 'hover' {
  // Check if vehicle is unavailable
  if (vehicle.status === 'garage' || vehicle.status === 'maintenance') {
    return 'unavailable'
  }
  
  // Check if booked
  const bookingInfo = getBookingForDate(date, vehicle.bookings)
  if (bookingInfo) {
    return 'booked'
  }
  
  // Check if selected
  if (selectedRange.start && selectedRange.end) {
    const rangeStart = selectedRange.start < selectedRange.end ? selectedRange.start : selectedRange.end
    const rangeEnd = selectedRange.start < selectedRange.end ? selectedRange.end : selectedRange.start
    if (isWithinInterval(date, { start: rangeStart, end: rangeEnd })) {
      return 'selected'
    }
  } else if (selectedRange.start && isSameDay(date, selectedRange.start)) {
    return 'selected'
  }
  
  // Check hover range
  if (selectedRange.start && !selectedRange.end && hoverDate) {
    const rangeStart = selectedRange.start < hoverDate ? selectedRange.start : hoverDate
    const rangeEnd = selectedRange.start < hoverDate ? hoverDate : selectedRange.start
    if (isWithinInterval(date, { start: rangeStart, end: rangeEnd })) {
      return 'hover'
    }
  }
  
  return 'available'
}

function hasOverlap(
  vehicleBookings: VehicleBooking[],
  startDate: Date,
  endDate: Date
): boolean {
  for (const booking of vehicleBookings) {
    if (booking.status === 'cancelled') continue
    const bookingStart = new Date(booking.start_date)
    const bookingEnd = new Date(booking.end_date)
    bookingStart.setHours(0, 0, 0, 0)
    bookingEnd.setHours(23, 59, 59, 999)
    
    // Check for overlap
    if (startDate <= bookingEnd && endDate >= bookingStart) {
      return true
    }
  }
  return false
}

export function BookingCalendar({ categories, locations = [] }: BookingCalendarProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(categories.map(c => c.id)))
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithBookings | null>(null)
  const [selectedRange, setSelectedRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })
  const [hoverDate, setHoverDate] = useState<Date | null>(null)
  const [showBookingDialog, setShowBookingDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  
  // Booking form
  const [bookingForm, setBookingForm] = useState({
    customer_name: '',
    customer_phone: '',
    notes: '',
  })
  
  // Get days for current month and next month (60 days view for cross-month bookings)
  const days = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(addMonths(currentMonth, 1))
    return eachDayOfInterval({ start, end })
  }, [currentMonth])
  
  // Group days by month for headers
  const daysByMonth = useMemo(() => {
    const groups: { month: Date; days: Date[] }[] = []
    let currentGroup: { month: Date; days: Date[] } | null = null
    
    for (const day of days) {
      const monthKey = format(day, 'yyyy-MM')
      if (!currentGroup || format(currentGroup.month, 'yyyy-MM') !== monthKey) {
        currentGroup = { month: startOfMonth(day), days: [] }
        groups.push(currentGroup)
      }
      currentGroup.days.push(day)
    }
    
    return groups
  }, [days])
  
  // Filter categories and vehicles
  const filteredCategories = useMemo(() => {
    return categories
      .filter(cat => categoryFilter === 'all' || cat.id === categoryFilter)
      .map(cat => ({
        ...cat,
        vehicles: cat.vehicles.filter(v => {
          if (statusFilter !== 'all') {
            if (statusFilter === 'booked') {
              // Check if vehicle has any active bookings this month
              const hasBooking = v.bookings.some(b => {
                if (b.status === 'cancelled') return false
                const start = new Date(b.start_date)
                const end = new Date(b.end_date)
                return days.some(d => d >= start && d <= end)
              })
              if (!hasBooking) return false
            } else if (v.status !== statusFilter) {
              return false
            }
          }
          if (locationFilter !== 'all' && v.location_id !== locationFilter) {
            return false
          }
          return true
        })
      }))
      .filter(cat => cat.vehicles.length > 0)
  }, [categories, categoryFilter, statusFilter, locationFilter, days])
  
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }
  
  const handleCellClick = useCallback((vehicle: VehicleWithBookings, date: Date) => {
    if (vehicle.status === 'garage' || vehicle.status === 'maintenance') return
    
    const bookingInfo = getBookingForDate(date, vehicle.bookings)
    if (bookingInfo) return // Can't select booked dates
    
    // If clicking on a different vehicle, always start fresh selection
    if (selectedVehicle && selectedVehicle.id !== vehicle.id) {
      // Only allow selection on one vehicle at a time
      setSelectedVehicle(vehicle)
      setSelectedRange({ start: date, end: null })
      return
    }
    
    if (!selectedVehicle) {
      // Start new selection on this vehicle
      setSelectedVehicle(vehicle)
      setSelectedRange({ start: date, end: null })
    } else if (!selectedRange.end) {
      // Complete the selection on the same vehicle
      const start = selectedRange.start!
      const rangeStart = start < date ? start : date
      const rangeEnd = start < date ? date : start
      
      // Check for overlapping bookings in the range
      if (hasOverlap(vehicle.bookings, rangeStart, rangeEnd)) {
        alert('Selected range overlaps with existing bookings')
        return
      }
      
      setSelectedRange({ start: rangeStart, end: rangeEnd })
      setShowBookingDialog(true)
    } else {
      // Already have a complete selection, start new one
      setSelectedRange({ start: date, end: null })
    }
  }, [selectedVehicle, selectedRange])
  
  const handleCreateBooking = async () => {
    if (!selectedVehicle || !selectedRange.start || !selectedRange.end) return
    
    setIsCreating(true)
    try {
      const { error } = await supabase.from('bookings').insert({
        vehicle_id: selectedVehicle.id,
        start_date: format(selectedRange.start, 'yyyy-MM-dd'),
        end_date: format(selectedRange.end, 'yyyy-MM-dd'),
        status: 'booked',
        customer_name: bookingForm.customer_name || null,
        customer_phone: bookingForm.customer_phone || null,
        notes: bookingForm.notes || null,
      })
      
      if (error) throw error
      
      setShowBookingDialog(false)
      resetSelection()
      router.refresh()
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Failed to create booking. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }
  
  const resetSelection = () => {
    setSelectedVehicle(null)
    setSelectedRange({ start: null, end: null })
    setHoverDate(null)
    setBookingForm({ customer_name: '', customer_phone: '', notes: '' })
  }
  
  // Calculate daily booking counts
  const dailyBookingCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const day of days) {
      const dateKey = format(day, 'yyyy-MM-dd')
      let count = 0
      for (const cat of filteredCategories) {
        for (const vehicle of cat.vehicles) {
          if (getBookingForDate(day, vehicle.bookings)) {
            count++
          }
        }
      }
      counts[dateKey] = count
    }
    return counts
  }, [days, filteredCategories])
  
  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="w-40 text-center font-medium">
              {format(currentMonth, 'MMMM yyyy')}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="h-8 w-px bg-border" />
          
          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Units</SelectItem>
              <SelectItem value="booked">Booked</SelectItem>
              <SelectItem value="idle">Idle</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="available">Reserved</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Location Filter */}
          {locations.length > 0 && (
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <div className="ml-auto flex items-center gap-4">
            {/* Legend */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="h-3 w-6 rounded bg-red-500" />
                <span>Booked</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-6 rounded bg-amber-400" />
                <span>Partial</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-6 rounded bg-slate-400" />
                <span>Unavailable</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-6 rounded border bg-background" />
                <span>Available</span>
              </div>
            </div>
            
            {/* Clear Selection */}
            {selectedVehicle && (
              <Button variant="outline" size="sm" onClick={resetSelection}>
                <X className="mr-1 h-3 w-3" />
                Clear Selection
              </Button>
            )}
          </div>
        </div>
        
        {/* Selection Info */}
        {selectedVehicle && (
          <div className="flex items-center gap-3 rounded-lg border border-primary bg-primary/5 p-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <span className="font-medium">{selectedVehicle.make} {selectedVehicle.model}</span>
              <span className="mx-2 text-muted-foreground">({selectedVehicle.license_plate})</span>
              {selectedRange.start && (
                <span className="text-sm">
                  {selectedRange.end ? (
                    <>
                      {format(selectedRange.start, 'MMM d')} - {format(selectedRange.end, 'MMM d, yyyy')}
                    </>
                  ) : (
                    <>Select end date (started: {format(selectedRange.start, 'MMM d')})</>
                  )}
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Calendar Grid */}
        <div className="overflow-auto rounded-lg border bg-card max-h-[70vh]">
          <div className="min-w-[1800px]">
            {/* Month Headers */}
            <div className="sticky top-0 z-20 flex border-b bg-slate-800 text-white">
              <div className="w-56 shrink-0 sticky left-0 z-30 bg-slate-800 border-r border-slate-600 px-4 py-2 font-medium">
                Vehicle
              </div>
              <div className="flex flex-1">
                {daysByMonth.map((group) => (
                  <div 
                    key={format(group.month, 'yyyy-MM')}
                    className="border-l border-slate-600 px-4 py-2 font-semibold text-center"
                    style={{ width: `${group.days.length * 40}px` }}
                  >
                    {format(group.month, 'MMMM yyyy')}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Header - Days */}
            <div className="sticky top-[41px] z-20 flex border-b bg-primary text-primary-foreground">
              <div className="w-56 shrink-0 sticky left-0 z-30 bg-primary border-r border-primary-foreground/20 px-4 py-2 font-medium">
                Date
              </div>
              <div className="flex flex-1">
                {days.map((day) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6
                  const dateKey = format(day, 'yyyy-MM-dd')
                  const bookingCount = dailyBookingCounts[dateKey] || 0
                  const isFirstOfMonth = day.getDate() === 1
                  
                  return (
                    <div 
                      key={dateKey} 
                      className={cn(
                        'flex w-10 shrink-0 flex-col items-center justify-center border-l border-primary-foreground/20 py-1 text-xs',
                        isWeekend && 'bg-primary-foreground/10',
                        isFirstOfMonth && 'border-l-2 border-l-white'
                      )}
                    >
                      <span className="font-medium">{format(day, 'd')}</span>
                      <span className="text-primary-foreground/70">{format(day, 'EEE')}</span>
                      {bookingCount > 0 && (
                        <Badge variant="secondary" className="mt-0.5 h-4 px-1 text-[10px]">
                          {bookingCount}
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Body */}
            <div>
              {filteredCategories.map((category) => {
                const isExpanded = expandedCategories.has(category.id)
                const vehicleCount = category.vehicles.length
                
                return (
                  <div key={category.id}>
                    {/* Category Row */}
                    <div 
                      className="flex cursor-pointer border-b bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                      onClick={() => toggleCategory(category.id)}
                    >
                      <div className="flex w-56 shrink-0 items-center gap-2 border-r px-4 py-2 sticky left-0 z-10 bg-sidebar">
                        <Badge variant="outline" className="h-6 w-6 justify-center rounded-full p-0">
                          {vehicleCount}
                        </Badge>
                        <span className="font-medium truncate">{category.name}</span>
                        {isExpanded ? (
                          <ChevronUp className="ml-auto h-4 w-4" />
                        ) : (
                          <ChevronDown className="ml-auto h-4 w-4" />
                        )}
                      </div>
                      <div className="flex flex-1">
                        {days.map((day) => {
                          const dateKey = format(day, 'yyyy-MM-dd')
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6
                          const isFirstOfMonth = day.getDate() === 1
                          
                          // Calculate availability for category
                          let booked = 0
                          let available = 0
                          let unavailable = 0
                          
                          for (const vehicle of category.vehicles) {
                            if (vehicle.status === 'garage' || vehicle.status === 'maintenance') {
                              unavailable++
                            } else if (getBookingForDate(day, vehicle.bookings)) {
                              booked++
                            } else {
                              available++
                            }
                          }
                          
                          const total = booked + available
                          let bgColor = 'bg-emerald-500 text-white'
                          if (total === 0) {
                            bgColor = 'bg-slate-400 text-white'
                          } else if (booked === total) {
                            bgColor = 'bg-red-500 text-white'
                          } else if (booked > 0) {
                            bgColor = 'bg-amber-400 text-foreground'
                          }
                          
                          return (
                            <div 
                              key={dateKey} 
                              className={cn(
                                'flex w-10 shrink-0 items-center justify-center border-l py-2 text-xs font-medium',
                                bgColor,
                                isWeekend && 'opacity-90',
                                isFirstOfMonth && 'border-l-2 border-l-white'
                              )}
                            >
                              {available}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    
                    {/* Expanded Vehicles */}
                    {isExpanded && category.vehicles.map((vehicle) => (
                      <div 
                        key={vehicle.id}
                        className={cn(
                          'flex border-b bg-card transition-colors',
                          selectedVehicle?.id === vehicle.id && 'bg-primary/5'
                        )}
                      >
                        <div className={cn(
                          "flex w-56 shrink-0 items-center gap-2 border-r px-4 py-1 pl-8 sticky left-0 z-10 bg-card",
                          selectedVehicle?.id === vehicle.id && "bg-primary/5"
                        )}>
                          <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate font-mono">
                            {vehicle.license_plate}
                          </span>
                          {(vehicle.status === 'garage' || vehicle.status === 'maintenance') && (
                            <Badge variant="secondary" className="ml-auto text-[10px]">
                              {vehicle.status === 'garage' ? 'Garage' : 'Service'}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-1">
                          {days.map((day) => {
                            const dateKey = format(day, 'yyyy-MM-dd')
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6
                            const isFirstOfMonth = day.getDate() === 1
                            const status = getCellStatus(vehicle, day, selectedRange, hoverDate)
                            const bookingInfo = getBookingForDate(day, vehicle.bookings)
                            
                            let bgClass = ''
                            let cursorClass = 'cursor-pointer'
                            
                            switch (status) {
                              case 'booked':
                                bgClass = 'bg-red-500'
                                cursorClass = 'cursor-not-allowed'
                                break
                              case 'unavailable':
                                bgClass = 'bg-slate-400'
                                cursorClass = 'cursor-not-allowed'
                                break
                              case 'selected':
                                bgClass = 'bg-primary'
                                break
                              case 'hover':
                                bgClass = 'bg-primary/50'
                                break
                              default:
                                bgClass = 'bg-emerald-100 hover:bg-emerald-200'
                            }
                            
                            const cell = (
                              <div 
                                key={dateKey}
                                className={cn(
                                  'w-10 shrink-0 border-l transition-colors',
                                  cursorClass,
                                  isFirstOfMonth && 'border-l-2 border-l-slate-400'
                                )}
                                onClick={() => handleCellClick(vehicle, day)}
                                onMouseEnter={() => {
                                  if (selectedVehicle?.id === vehicle.id && selectedRange.start && !selectedRange.end) {
                                    setHoverDate(day)
                                  }
                                }}
                                onMouseLeave={() => setHoverDate(null)}
                              >
                                <div className={cn(
                                  'h-7 w-full flex items-center justify-center',
                                  bgClass,
                                  isWeekend && 'opacity-90',
                                  bookingInfo?.isStart && 'rounded-l',
                                  bookingInfo?.isEnd && 'rounded-r'
                                )}>
                                  {bookingInfo?.isStart && (
                                    <div className="w-1 h-4 bg-white/50 rounded-full" />
                                  )}
                                </div>
                              </div>
                            )
                            
                            if (bookingInfo) {
                              return (
                                <Tooltip key={dateKey}>
                                  <TooltipTrigger asChild>
                                    {cell}
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <div className="space-y-1">
                                      <div className="font-medium flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {bookingInfo.booking.customer_name || 'No customer name'}
                                      </div>
                                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(bookingInfo.booking.start_date), 'MMM d')} - {format(new Date(bookingInfo.booking.end_date), 'MMM d, yyyy')}
                                      </div>
                                      {bookingInfo.booking.notes && (
                                        <div className="text-xs">{bookingInfo.booking.notes}</div>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              )
                            }
                            
                            return cell
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        
        {/* Create Booking Dialog */}
        <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Booking
              </DialogTitle>
            </DialogHeader>
            
            {selectedVehicle && selectedRange.start && selectedRange.end && (
              <div className="space-y-4">
                {/* Booking Summary */}
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{selectedVehicle.make} {selectedVehicle.model}</span>
                    <Badge variant="outline">{selectedVehicle.license_plate}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{format(selectedRange.start, 'MMMM d, yyyy')} - {format(selectedRange.end, 'MMMM d, yyyy')}</span>
                  </div>
                </div>
                
                {/* Customer Details */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="customer_name">Customer Name</Label>
                    <Input
                      id="customer_name"
                      placeholder="Enter customer name"
                      value={bookingForm.customer_name}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, customer_name: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="customer_phone">Phone Number</Label>
                    <Input
                      id="customer_phone"
                      placeholder="Enter phone number"
                      value={bookingForm.customer_phone}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, customer_phone: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any notes..."
                      value={bookingForm.notes}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBookingDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateBooking} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Booking'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

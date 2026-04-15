'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Car } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CategoryWithVehicles, VehicleBooking } from '@/lib/types'

interface AvailabilityCalendarProps {
  categories: CategoryWithVehicles[]
  month: number
  year: number
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getDayName(day: number, month: number, year: number): string {
  const date = new Date(year, month, day)
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

function isDateBooked(date: Date, bookings: VehicleBooking[]): boolean {
  return bookings.some((booking) => {
    if (booking.status === 'cancelled') return false
    const start = new Date(booking.start_date)
    const end = new Date(booking.end_date)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    return date >= start && date <= end
  })
}

function getAvailabilityCount(
  vehicles: CategoryWithVehicles['vehicles'],
  day: number,
  month: number,
  year: number
): number {
  const date = new Date(year, month, day)
  date.setHours(12, 0, 0, 0)
  
  let available = 0
  for (const vehicle of vehicles) {
    if (vehicle.status === 'garage' || vehicle.status === 'maintenance') continue
    if (!isDateBooked(date, vehicle.bookings)) {
      available++
    }
  }
  return available
}

function getAvailabilityColor(available: number, total: number): string {
  if (total === 0) return 'bg-muted text-muted-foreground'
  const ratio = available / total
  if (ratio === 0) return 'bg-red-500 text-white'
  if (ratio < 0.3) return 'bg-orange-500 text-white'
  if (ratio < 0.7) return 'bg-amber-400 text-foreground'
  return 'bg-emerald-500 text-white'
}

function VehicleAvailabilityColor({ 
  vehicle, 
  day, 
  month, 
  year 
}: { 
  vehicle: CategoryWithVehicles['vehicles'][0]
  day: number
  month: number
  year: number 
}) {
  const date = new Date(year, month, day)
  date.setHours(12, 0, 0, 0)
  
  if (vehicle.status === 'garage' || vehicle.status === 'maintenance') {
    return <div className="h-6 w-full bg-slate-400" title="In garage/maintenance" />
  }
  
  const booked = isDateBooked(date, vehicle.bookings)
  
  return (
    <div 
      className={cn(
        'h-6 w-full flex items-center justify-center text-xs',
        booked ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
      )}
      title={booked ? 'Booked' : 'Available'}
    >
      {booked ? '' : ''}
    </div>
  )
}

export function AvailabilityCalendar({ categories, month, year }: AvailabilityCalendarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  
  const daysInMonth = useMemo(() => getDaysInMonth(month, year), [month, year])
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth])
  
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
  
  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <div className="min-w-[1200px]">
        {/* Header */}
        <div className="flex border-b bg-primary text-primary-foreground">
          <div className="flex w-64 shrink-0 items-center px-4 py-3 font-medium">
            {monthName}
          </div>
          <div className="flex flex-1">
            {days.map((day) => (
              <div 
                key={day} 
                className="flex w-10 shrink-0 flex-col items-center justify-center border-l border-primary-foreground/20 py-2 text-xs"
              >
                <span className="font-medium">{day}</span>
                <span className="text-primary-foreground/70">{getDayName(day, month, year)}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Body */}
        <div>
          {categories.map((category) => {
            const isExpanded = expandedCategories.has(category.id)
            const vehicleCount = category.vehicles.length
            const activeVehicles = category.vehicles.filter(
              (v) => v.status !== 'garage' && v.status !== 'maintenance'
            ).length
            
            return (
              <div key={category.id}>
                {/* Category Row */}
                <div 
                  className="flex cursor-pointer border-b bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex w-64 shrink-0 items-center gap-2 px-4 py-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      {vehicleCount}
                    </span>
                    <span className="font-medium truncate">{category.name}</span>
                    {isExpanded ? (
                      <ChevronUp className="ml-auto h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-auto h-4 w-4" />
                    )}
                  </div>
                  <div className="flex flex-1">
                    {days.map((day) => {
                      const available = getAvailabilityCount(category.vehicles, day, month, year)
                      const colorClass = getAvailabilityColor(available, activeVehicles)
                      return (
                        <div 
                          key={day} 
                          className={cn(
                            'flex w-10 shrink-0 items-center justify-center border-l border-sidebar-border py-2 text-xs font-medium',
                            colorClass
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
                    className="flex border-b bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex w-64 shrink-0 items-center gap-2 px-4 py-1 pl-10">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate">
                        #{vehicle.license_plate}
                      </span>
                      {vehicle.status === 'garage' && (
                        <span className="ml-auto rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">
                          Garage
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1">
                      {days.map((day) => (
                        <div key={day} className="w-10 shrink-0 border-l border-border">
                          <VehicleAvailabilityColor 
                            vehicle={vehicle} 
                            day={day} 
                            month={month} 
                            year={year}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

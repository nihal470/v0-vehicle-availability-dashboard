'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Car, Layers } from 'lucide-react'
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

function isWeekend(day: number, month: number, year: number): boolean {
  const date = new Date(year, month, day)
  const dayOfWeek = date.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6
}

function isToday(day: number, month: number, year: number): boolean {
  const today = new Date()
  return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
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

function getAvailabilityStyle(available: number, total: number): { bg: string; text: string } {
  if (total === 0) return { bg: 'bg-slate-200', text: 'text-slate-500' }
  const ratio = available / total
  if (ratio === 0) return { bg: 'bg-gradient-to-b from-red-500 to-red-600', text: 'text-white' }
  if (ratio < 0.3) return { bg: 'bg-gradient-to-b from-orange-400 to-orange-500', text: 'text-white' }
  if (ratio < 0.7) return { bg: 'bg-gradient-to-b from-amber-400 to-amber-500', text: 'text-slate-800' }
  return { bg: 'bg-gradient-to-b from-emerald-400 to-emerald-500', text: 'text-white' }
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
    return (
      <div 
        className="h-7 w-full bg-gradient-to-b from-slate-300 to-slate-400 flex items-center justify-center" 
        title="In garage/maintenance"
      />
    )
  }
  
  const booked = isDateBooked(date, vehicle.bookings)
  
  return (
    <div 
      className={cn(
        'h-7 w-full flex items-center justify-center text-xs font-medium transition-all',
        booked 
          ? 'bg-gradient-to-b from-red-400 to-red-500 text-white' 
          : 'bg-gradient-to-b from-emerald-400 to-emerald-500 text-white'
      )}
      title={booked ? 'Booked' : 'Available'}
    />
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
  
  // Calculate total available vehicles for the month
  const totalVehicles = categories.reduce((sum, cat) => sum + cat.vehicles.length, 0)
  
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1200px]">
        {/* Header */}
        <div className="flex border-b bg-gradient-to-r from-slate-800 to-slate-900 text-white">
          <div className="flex w-64 shrink-0 items-center gap-3 px-4 py-4 font-medium">
            <Layers className="h-5 w-5 text-slate-400" />
            <div>
              <p className="font-semibold">{monthName}</p>
              <p className="text-xs text-slate-400">{totalVehicles} vehicles</p>
            </div>
          </div>
          <div className="flex flex-1">
            {days.map((day) => {
              const weekend = isWeekend(day, month, year)
              const today = isToday(day, month, year)
              return (
                <div 
                  key={day} 
                  className={cn(
                    'flex w-10 shrink-0 flex-col items-center justify-center border-l border-slate-700 py-2 text-xs transition-colors',
                    weekend && 'bg-slate-700/50',
                    today && 'bg-primary/20'
                  )}
                >
                  <span className={cn('font-bold', today && 'text-primary-foreground')}>{day}</span>
                  <span className={cn('text-slate-400', today && 'text-primary-foreground/80')}>
                    {getDayName(day, month, year)}
                  </span>
                  {today && (
                    <div className="mt-1 h-1 w-4 rounded-full bg-primary" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Body */}
        <div>
          {categories.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <div className="text-center">
                <Car className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No vehicles found matching your filters</p>
              </div>
            </div>
          ) : categories.map((category) => {
            const isExpanded = expandedCategories.has(category.id)
            const vehicleCount = category.vehicles.length
            const activeVehicles = category.vehicles.filter(
              (v) => v.status !== 'garage' && v.status !== 'maintenance'
            ).length
            
            return (
              <div key={category.id}>
                {/* Category Row */}
                <div 
                  className="flex cursor-pointer border-b bg-gradient-to-r from-slate-100 to-slate-50 hover:from-slate-200 hover:to-slate-100 transition-all"
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex w-64 shrink-0 items-center gap-3 px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-xs font-bold text-white shadow-sm">
                      {vehicleCount}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold truncate block">{category.name}</span>
                      <span className="text-xs text-muted-foreground">{activeVehicles} active</span>
                    </div>
                    <div className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
                      isExpanded ? "bg-primary text-white" : "bg-slate-200 text-slate-500"
                    )}>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-1">
                    {days.map((day) => {
                      const available = getAvailabilityCount(category.vehicles, day, month, year)
                      const style = getAvailabilityStyle(available, activeVehicles)
                      const weekend = isWeekend(day, month, year)
                      const today = isToday(day, month, year)
                      return (
                        <div 
                          key={day} 
                          className={cn(
                            'flex w-10 shrink-0 items-center justify-center border-l border-slate-200 py-3 text-xs font-bold transition-all',
                            style.bg,
                            style.text,
                            weekend && 'opacity-90',
                            today && 'ring-2 ring-inset ring-primary'
                          )}
                        >
                          {available}
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                {/* Expanded Vehicles */}
                {isExpanded && category.vehicles.map((vehicle, index) => (
                  <div 
                    key={vehicle.id}
                    className={cn(
                      "flex border-b transition-colors hover:bg-slate-50",
                      index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    )}
                  >
                    <div className="flex w-64 shrink-0 items-center gap-3 px-4 py-1.5 pl-12">
                      <div className={cn(
                        "flex h-6 w-6 items-center justify-center rounded",
                        vehicle.status === 'garage' || vehicle.status === 'maintenance'
                          ? "bg-slate-200 text-slate-500"
                          : "bg-emerald-100 text-emerald-600"
                      )}>
                        <Car className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-sm font-mono truncate">
                        {vehicle.license_plate}
                      </span>
                      {(vehicle.status === 'garage' || vehicle.status === 'maintenance') && (
                        <span className="ml-auto rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {vehicle.status === 'garage' ? 'Garage' : 'Service'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1">
                      {days.map((day) => {
                        const weekend = isWeekend(day, month, year)
                        const today = isToday(day, month, year)
                        return (
                          <div 
                            key={day} 
                            className={cn(
                              "w-10 shrink-0 border-l border-slate-100",
                              weekend && "bg-slate-50",
                              today && "ring-1 ring-inset ring-primary/30"
                            )}
                          >
                            <VehicleAvailabilityColor 
                              vehicle={vehicle} 
                              day={day} 
                              month={month} 
                              year={year}
                            />
                          </div>
                        )
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
  )
}

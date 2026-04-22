'use client'

import { useState, useMemo } from 'react'
import { StatsCards } from './stats-cards'
import { FilterBar } from './filter-bar'
import { AvailabilityCalendar } from './availability-calendar'
import { UpcomingReturns } from './upcoming-returns'
import type { CategoryWithVehicles, Location, VehicleCategory, FleetStats } from '@/lib/types'

interface DashboardProps {
  initialCategories: CategoryWithVehicles[]
  locations: Location[]
  allCategories: VehicleCategory[]
  stats: FleetStats
}

export function Dashboard({ 
  initialCategories, 
  locations, 
  allCategories,
  stats 
}: DashboardProps) {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [appliedFilters, setAppliedFilters] = useState({
    location: 'all',
    category: 'all',
  })

  const filteredCategories = useMemo(() => {
    let result = initialCategories

    if (appliedFilters.category !== 'all') {
      result = result.filter((cat) => cat.id === appliedFilters.category)
    }

    if (appliedFilters.location !== 'all') {
      result = result.map((cat) => ({
        ...cat,
        vehicles: cat.vehicles.filter((v) => v.location_id === appliedFilters.location),
      })).filter((cat) => cat.vehicles.length > 0)
    }

    // Filter by vehicle status
    if (selectedStatus !== 'all') {
      result = result.map((cat) => ({
        ...cat,
        vehicles: cat.vehicles.filter((v) => v.status === selectedStatus),
      })).filter((cat) => cat.vehicles.length > 0)
    }

    return result
  }, [initialCategories, appliedFilters, selectedStatus])

  const handleApply = () => {
    setAppliedFilters({
      location: selectedLocation,
      category: selectedCategory,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Upcoming Returns Section */}
      <UpcomingReturns />
      
      <StatsCards 
        stats={stats} 
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
      />
      
      {/* Status Filter Info */}
      {selectedStatus !== 'all' && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-2">
          <p className="text-sm">
            Showing <span className="font-semibold capitalize">{selectedStatus}</span> vehicles only
          </p>
          <button 
            onClick={() => setSelectedStatus('all')}
            className="text-sm text-primary hover:underline"
          >
            Clear filter
          </button>
        </div>
      )}
      
      <FilterBar
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
        locations={locations}
        categories={allCategories}
        selectedLocation={selectedLocation}
        selectedCategory={selectedCategory}
        onLocationChange={setSelectedLocation}
        onCategoryChange={setSelectedCategory}
        onApply={handleApply}
      />
      
      <AvailabilityCalendar
        categories={filteredCategories}
        month={selectedMonth}
        year={selectedYear}
      />
      
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4 text-sm">
        <span className="font-medium">Legend:</span>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-emerald-500" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-amber-400" />
          <span>Limited</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-orange-500" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-red-500" />
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-slate-400" />
          <span>Garage/Maintenance</span>
        </div>
      </div>
    </div>
  )
}

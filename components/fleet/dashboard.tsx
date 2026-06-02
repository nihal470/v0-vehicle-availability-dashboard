'use client'

import { useState, useMemo } from 'react'
import { StatsCards } from './stats-cards'
import { FilterBar } from './filter-bar'
import { AvailabilityCalendar } from './availability-calendar'
import { ReturnsSummary } from './returns-summary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, FileText, ChevronRight, Info, Receipt } from 'lucide-react'
import Link from 'next/link'
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
      {/* Returns & Stats Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ReturnsSummary />
        </div>
        <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/calendar" className="block">
              <Button variant="outline" className="w-full justify-between group hover:border-primary hover:bg-primary/5">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Booking Calendar
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Button>
            </Link>
            <Link href="/vehicle-logs" className="block">
              <Button variant="outline" className="w-full justify-between group hover:border-primary hover:bg-primary/5">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Trip Logs & Fines
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Button>
            </Link>
            <Link href="/payments" className="block">
              <Button variant="outline" className="w-full justify-between group hover:border-primary hover:bg-primary/5">
                <span className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  Payments & Receipts
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      
      {/* Fleet Status Overview */}
      <div>
        <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
          Fleet Status Overview
          <span className="text-sm font-normal text-muted-foreground">
            Click any card to filter the calendar below
          </span>
        </h2>
        <StatsCards 
          stats={stats} 
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
        />
      </div>
      
      {/* Active Filter Indicator */}
      {selectedStatus !== 'all' && (
        <div className="flex items-center justify-between rounded-lg border-2 border-primary/30 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-sm font-medium">
              Filtering by: <span className="capitalize text-primary">{selectedStatus}</span> vehicles
            </p>
          </div>
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => setSelectedStatus('all')}
            className="text-primary hover:text-primary hover:bg-primary/10"
          >
            Clear Filter
          </Button>
        </div>
      )}
      
      {/* Filters & Calendar */}
      <Card>
        <CardHeader className="border-b bg-muted/30 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-medium">
              Availability Calendar
            </CardTitle>
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
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <AvailabilityCalendar
            categories={filteredCategories}
            month={selectedMonth}
            year={selectedYear}
          />
        </CardContent>
      </Card>
      
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 rounded-xl border bg-gradient-to-r from-slate-50 to-white p-4 shadow-sm">
        <span className="font-medium text-slate-700">Legend:</span>
        <div className="flex items-center gap-2">
          <div className="h-4 w-8 rounded bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-sm" />
          <span className="text-sm">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-8 rounded bg-gradient-to-r from-amber-400 to-amber-500 shadow-sm" />
          <span className="text-sm">Limited</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-8 rounded bg-gradient-to-r from-orange-400 to-orange-600 shadow-sm" />
          <span className="text-sm">Low</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-8 rounded bg-gradient-to-r from-red-400 to-red-600 shadow-sm" />
          <span className="text-sm">Fully Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-8 rounded bg-gradient-to-r from-slate-400 to-slate-500 shadow-sm" />
          <span className="text-sm">Unavailable</span>
        </div>
      </div>
    </div>
  )
}

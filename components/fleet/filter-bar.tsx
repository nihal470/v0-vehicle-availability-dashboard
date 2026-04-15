'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Location, VehicleCategory } from '@/lib/types'

interface FilterBarProps {
  selectedMonth: number
  selectedYear: number
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
  locations: Location[]
  categories: VehicleCategory[]
  selectedLocation: string
  selectedCategory: string
  onLocationChange: (location: string) => void
  onCategoryChange: (category: string) => void
  onApply: () => void
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function FilterBar({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  locations,
  categories,
  selectedLocation,
  selectedCategory,
  onLocationChange,
  onCategoryChange,
  onApply,
}: FilterBarProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i)

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
      <Select
        value={String(selectedMonth)}
        onValueChange={(val) => onMonthChange(Number(val))}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {months.map((month, index) => (
            <SelectItem key={index} value={String(index)}>
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(selectedYear)}
        onValueChange={(val) => onYearChange(Number(val))}
      >
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedCategory} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedLocation} onValueChange={onLocationChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Locations" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Locations</SelectItem>
          {locations.map((location) => (
            <SelectItem key={location.id} value={location.id}>
              {location.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button onClick={onApply} className="ml-auto">
        Apply Filters
      </Button>
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'
import { Vehicle } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight, Search, CalendarRange } from 'lucide-react'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isWeekend,
  isToday,
  parseISO,
  isValid,
  differenceInCalendarDays,
  max as maxDate,
  min as minDate,
} from 'date-fns'

interface Props {
  vehicles: Vehicle[]
}

function parseDate(value: string | null): Date | null {
  if (!value) return null
  const d = parseISO(value)
  return isValid(d) ? d : null
}

export function RentalGanttChart({ vehicles }: Props) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('agreements')

  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth])
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth])
  const days = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthStart, monthEnd]
  )
  const totalDays = days.length

  // Vehicles that have an agreement overlapping the visible month
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return vehicles
      .map((vehicle) => {
        const start = parseDate(vehicle.start_date)
        const end = parseDate(vehicle.return_date)
        return { vehicle, start, end }
      })
      .filter(({ vehicle, start, end }) => {
        // must have a valid agreement period
        if (!start || !end) return false
        // overlaps current month
        if (end < monthStart || start > monthEnd) return false
        // search filter
        if (q) {
          const hay = `${vehicle.make} ${vehicle.model} ${vehicle.license_plate} ${vehicle.customer_name ?? ''} ${vehicle.ag_no ?? ''}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        // status filter
        if (statusFilter === 'running' && vehicle.status !== 'running') return false
        return true
      })
      .sort((a, b) => (a.start && b.start ? a.start.getTime() - b.start.getTime() : 0))
  }, [vehicles, monthStart, monthEnd, search, statusFilter])

  // Compute a bar's left offset (%) and width (%) within the month grid
  function getBarGeometry(start: Date, end: Date) {
    const clampedStart = maxDate([start, monthStart])
    const clampedEnd = minDate([end, monthEnd])
    const startIndex = differenceInCalendarDays(clampedStart, monthStart) // 0-based
    const spanDays = differenceInCalendarDays(clampedEnd, clampedStart) + 1
    const left = (startIndex / totalDays) * 100
    const width = (spanDays / totalDays) * 100
    const continuesLeft = start < monthStart
    const continuesRight = end > monthEnd
    return { left, width, continuesLeft, continuesRight }
  }

  const monthLabel = format(currentMonth, 'MMMM yyyy')

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[160px] text-center">
            <span className="text-lg font-semibold">{monthLabel}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-1"
            onClick={() => setCurrentMonth(startOfMonth(new Date()))}
          >
            Today
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vehicle, customer, AG no"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 sm:w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agreements">All Agreements</SelectItem>
              <SelectItem value="running">Running Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Gantt */}
      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
              <CalendarRange className="h-10 w-10 opacity-40" />
              <p className="text-sm">No rental agreements during {monthLabel}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                {/* Header row: day numbers */}
                <div className="flex border-b bg-muted/40">
                  <div className="w-56 shrink-0 border-r px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Vehicle
                  </div>
                  <div className="flex flex-1">
                    {days.map((day) => (
                      <div
                        key={day.toISOString()}
                        className={`flex-1 border-r py-1 text-center last:border-r-0 ${
                          isWeekend(day) ? 'bg-muted/50' : ''
                        }`}
                      >
                        <div
                          className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                            isToday(day)
                              ? 'bg-primary font-bold text-primary-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {format(day, 'd')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vehicle rows */}
                {rows.map(({ vehicle, start, end }) => {
                  const { left, width, continuesLeft, continuesRight } = getBarGeometry(
                    start as Date,
                    end as Date
                  )
                  return (
                    <div key={vehicle.id} className="flex border-b last:border-b-0 hover:bg-muted/20">
                      {/* Label */}
                      <div className="w-56 shrink-0 border-r px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {vehicle.make} {vehicle.model}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                            {vehicle.license_plate}
                          </Badge>
                          {vehicle.customer_name && (
                            <span className="truncate text-xs text-muted-foreground">
                              {vehicle.customer_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Timeline track */}
                      <div className="relative flex-1">
                        {/* day grid background */}
                        <div className="absolute inset-0 flex">
                          {days.map((day) => (
                            <div
                              key={day.toISOString()}
                              className={`flex-1 border-r last:border-r-0 ${
                                isWeekend(day) ? 'bg-muted/40' : ''
                              }`}
                            />
                          ))}
                        </div>

                        {/* bar */}
                        <div className="relative flex h-full items-center py-3">
                          <div
                            className={`absolute flex h-7 items-center overflow-hidden bg-primary px-2 text-[11px] font-medium text-primary-foreground shadow-sm ${
                              continuesLeft ? 'rounded-l-none' : 'rounded-l-md'
                            } ${continuesRight ? 'rounded-r-none' : 'rounded-r-md'}`}
                            style={{ left: `${left}%`, width: `${width}%` }}
                            title={`${vehicle.customer_name ?? 'Agreement'}: ${format(
                              start as Date,
                              'MMM d'
                            )} - ${format(end as Date, 'MMM d, yyyy')}`}
                          >
                            <span className="truncate">
                              {vehicle.ag_no ? `${vehicle.ag_no} · ` : ''}
                              {vehicle.customer_name ?? 'Agreement'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-3 w-5 rounded-sm bg-primary" />
          Rental agreement period
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-5 rounded-sm bg-muted" />
          Weekend
        </div>
        <span>
          Showing {rows.length} agreement{rows.length === 1 ? '' : 's'} in {monthLabel}
        </span>
      </div>
    </div>
  )
}

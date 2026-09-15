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
import { ChevronLeft, ChevronRight, Search, CalendarRange, SlidersHorizontal, ZoomIn, ZoomOut, Maximize2, Info } from 'lucide-react'
import {
  startOfDay,
  addDays,
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
  const [currentMonth, setCurrentMonth] = useState(() => startOfDay(new Date()))
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('agreements')

  const monthStart = useMemo(() => startOfDay(currentMonth), [currentMonth])
  const monthEnd = useMemo(() => addDays(monthStart, 30), [monthStart])
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

  const monthLabel = `${format(monthStart, 'dd MMMM yyyy')} – ${format(monthEnd, 'dd MMMM yyyy')}`
  const barClass = (status: string) => status === 'running' ? 'bg-sky-500' : status === 'reserved' ? 'bg-violet-600' : status === 'available' ? 'bg-emerald-500' : status === 'maintenance' ? 'bg-orange-500' : 'bg-slate-400'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-xl border bg-background px-5 py-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="flex size-9 items-center justify-center rounded-full border text-muted-foreground"><Info className="size-4" /></span>
          {[['running', 'Booking', 'bg-sky-500'], ['reserved', 'Reserved', 'bg-violet-600'], ['available', 'Rental', 'bg-orange-500'], ['open', 'Open', 'bg-slate-400'], ['maintenance', 'In service', 'bg-orange-500'], ['done', 'Done', 'bg-emerald-500']].map(([key, label, color]) => <button key={key} type="button" onClick={() => setStatusFilter(key === 'open' ? 'agreements' : key)} className={`rounded-full px-3 py-1 text-white ${color} ${statusFilter === key ? 'ring-2 ring-primary ring-offset-2' : ''}`}>{label}</button>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm"><SlidersHorizontal className="mr-2 size-4" />Filters</Button>
          <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground"><CalendarRange className="size-4 text-primary" />{monthLabel}</div>
          <Button variant="outline" size="icon" aria-label="Zoom in"><ZoomIn className="size-4" /></Button><Button variant="outline" size="icon" aria-label="Zoom out"><ZoomOut className="size-4" /></Button><Button variant="outline" size="icon" aria-label="Expand planner"><Maximize2 className="size-4" /></Button>
        </div>
      </div>
      {/* Controls */}
      <div className="flex flex-col gap-3 border-x border-b bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
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
            onClick={() => setCurrentMonth(startOfDay(new Date()))}
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
      <Card className="overflow-hidden rounded-b-xl rounded-t-none border-t-0 shadow-sm">
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
                  <div className="w-56 shrink-0 border-r bg-background px-4 py-3 text-xs font-semibold text-muted-foreground">
                    Vehicle
                  </div>
                  <div className="flex flex-1">
                    {days.map((day) => (
                      <div key={day.toISOString()} className={`flex min-w-[52px] flex-1 flex-col items-center border-r py-2 text-center last:border-r-0 ${isWeekend(day) ? 'bg-muted/50' : ''}`}>
                        <span className="text-[10px] font-semibold text-muted-foreground">{format(day, 'EEE')}</span>
                        <div className={`mt-1 flex size-7 items-center justify-center rounded-full text-xs ${isToday(day) ? 'bg-primary font-bold text-primary-foreground' : 'text-foreground'}`}>{format(day, 'd')}</div>
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
                      <div className="w-56 shrink-0 border-r bg-background px-4 py-3">
                        <div className="truncate text-sm font-semibold uppercase">{vehicle.make} {vehicle.model}</div>
                        <div className="mt-1 flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-500" /><span className="text-xs text-muted-foreground">{vehicle.license_plate}</span></div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">{vehicle.customer_name ?? 'Available vehicle'}</div>
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
                            className={`absolute flex h-11 items-center overflow-hidden px-3 text-[10px] font-medium text-white shadow-sm ${barClass(vehicle.status)} ${
                              continuesLeft ? 'rounded-l-none' : 'rounded-l-md'
                            } ${continuesRight ? 'rounded-r-none' : 'rounded-r-md'}`}
                            style={{ left: `${left}%`, width: `${width}%` }}
                            title={`${vehicle.customer_name ?? 'Agreement'}: ${format(
                              start as Date,
                              'MMM d'
                            )} - ${format(end as Date, 'MMM d, yyyy')}`}
                          >
                            <span className="flex min-w-0 flex-col truncate leading-tight"><strong className="truncate">{vehicle.ag_no ? `ID ${vehicle.ag_no}` : vehicle.customer_name ?? 'Rental'}</strong><span className="truncate text-[9px] opacity-90">From: {format(start as Date, 'dd.MM.yyyy/HH:mm')} · To: {format(end as Date, 'dd.MM.yyyy/HH:mm')}</span></span>
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

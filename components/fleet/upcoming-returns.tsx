'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { Vehicle } from '@/lib/types'
import { format, differenceInHours, differenceInDays, isPast, isToday, isTomorrow } from 'date-fns'
import { 
  AlertTriangle, 
  Clock, 
  CalendarClock, 
  CalendarRange,
  Car, 
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  User,
  FileText,
  MapPin
} from 'lucide-react'

interface ReturnSchedule {
  vehicle: Vehicle
  returnDate: Date
  status: 'overdue' | 'due-today' | 'due-tomorrow' | 'due-soon' | 'upcoming'
  hoursRemaining: number
  daysRemaining: number
}

export function UpcomingReturns() {
  const [schedules, setSchedules] = useState<ReturnSchedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const fetchSchedules = async () => {
    setIsLoading(true)
    const supabase = createClient()
    
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'running')
      .not('return_date', 'is', null)
      .order('return_date', { ascending: true })

    if (vehicles) {
      const now = new Date()
      const returnSchedules: ReturnSchedule[] = vehicles.map((vehicle: Vehicle) => {
        // Combine the return date with the return time (if provided) for accurate scheduling
        const returnDate = new Date(vehicle.return_date!)
        if (vehicle.return_time) {
          const [hh, mm] = vehicle.return_time.split(':')
          if (hh !== undefined) {
            returnDate.setHours(Number(hh), Number(mm ?? 0), 0, 0)
          }
        }
        const hoursRemaining = differenceInHours(returnDate, now)
        const daysRemaining = differenceInDays(returnDate, now)
        
        let status: ReturnSchedule['status'] = 'upcoming'
        
        if (isPast(returnDate)) {
          status = 'overdue'
        } else if (isToday(returnDate)) {
          status = 'due-today'
        } else if (isTomorrow(returnDate)) {
          status = 'due-tomorrow'
        } else if (hoursRemaining <= 72) {
          status = 'due-soon'
        }

        return {
          vehicle,
          returnDate,
          status,
          hoursRemaining,
          daysRemaining
        }
      })

      // Sort: overdue first, then by return date
      returnSchedules.sort((a, b) => {
        const statusOrder = { 'overdue': 0, 'due-today': 1, 'due-tomorrow': 2, 'due-soon': 3, 'upcoming': 4 }
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status]
        }
        return a.returnDate.getTime() - b.returnDate.getTime()
      })

      setSchedules(returnSchedules)
    }
    
    setIsLoading(false)
    setLastUpdated(new Date())
  }

  useEffect(() => {
    fetchSchedules()
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchSchedules, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = (schedule: ReturnSchedule) => {
    switch (schedule.status) {
      case 'overdue':
        return (
          <Badge className="bg-red-500 hover:bg-red-600 animate-pulse">
            <AlertTriangle className="w-3 h-3 mr-1" />
            OVERDUE
          </Badge>
        )
      case 'due-today':
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600">
            <AlertCircle className="w-3 h-3 mr-1" />
            DUE TODAY
          </Badge>
        )
      case 'due-tomorrow':
        return (
          <Badge className="bg-orange-500 hover:bg-orange-600">
            <Clock className="w-3 h-3 mr-1" />
            DUE TOMORROW
          </Badge>
        )
      case 'due-soon':
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600">
            <CalendarClock className="w-3 h-3 mr-1" />
            DUE SOON
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            UPCOMING
          </Badge>
        )
    }
  }

  const getRentalTypeBadge = (rentalType: Vehicle['rental_type']) => {
    if (rentalType === 'monthly') {
      return (
        <Badge variant="outline" className="border-purple-300 bg-purple-50 text-purple-700">
          <CalendarRange className="w-3 h-3 mr-1" />
          Monthly
        </Badge>
      )
    }
    if (rentalType === 'daily') {
      return (
        <Badge variant="outline" className="border-teal-300 bg-teal-50 text-teal-700">
          <CalendarClock className="w-3 h-3 mr-1" />
          Daily
        </Badge>
      )
    }
    return null
  }

  const getTimeRemaining = (schedule: ReturnSchedule) => {
    if (schedule.status === 'overdue') {
      const overdueDays = Math.abs(schedule.daysRemaining)
      const overdueHours = Math.abs(schedule.hoursRemaining) % 24
      if (overdueDays > 0) {
        return `${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue`
      }
      return `${overdueHours} hour${overdueHours !== 1 ? 's' : ''} overdue`
    }
    
    if (schedule.hoursRemaining < 24) {
      return `${schedule.hoursRemaining} hour${schedule.hoursRemaining !== 1 ? 's' : ''} left`
    }
    
    return `${schedule.daysRemaining} day${schedule.daysRemaining !== 1 ? 's' : ''} left`
  }

  const overdueCount = schedules.filter(s => s.status === 'overdue').length
  const dueTodayCount = schedules.filter(s => s.status === 'due-today').length
  const dueSoonCount = schedules.filter(s => s.status === 'due-tomorrow' || s.status === 'due-soon').length

  // Split returns by branch: Salalah is shown separately on the right
  const salalahSchedules = schedules.filter(s => s.vehicle.branch === 'Salalah')
  const otherSchedules = schedules.filter(s => s.vehicle.branch !== 'Salalah')

  const renderScheduleItem = (schedule: ReturnSchedule) => (
    <div
      key={schedule.vehicle.id}
      className={`p-4 rounded-lg border-2 transition-all ${
        schedule.status === 'overdue' 
          ? 'border-red-400 bg-red-50 shadow-md' 
          : schedule.status === 'due-today'
          ? 'border-amber-400 bg-amber-50'
          : schedule.status === 'due-tomorrow'
          ? 'border-orange-300 bg-orange-50'
          : schedule.status === 'due-soon'
          ? 'border-blue-300 bg-blue-50'
          : 'border-muted bg-background'
      }`}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Car className="h-5 w-5 text-primary" />
            <span className="font-semibold">
              {schedule.vehicle.make} {schedule.vehicle.model}
            </span>
            <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">
              {schedule.vehicle.license_plate}
            </span>
            {getStatusBadge(schedule)}
            {getRentalTypeBadge(schedule.vehicle.rental_type)}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-medium">{schedule.vehicle.customer_name || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">AG No:</span>
              <span className="font-mono">{schedule.vehicle.ag_no || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Return to:</span>
              <span className="font-medium">{schedule.vehicle.expected_return_location || '-'}</span>
            </div>
          </div>
        </div>
        
        <div className="xl:text-right">
          <p className="text-sm text-muted-foreground">Return Date &amp; Time</p>
          <p className="font-semibold">{format(schedule.returnDate, 'dd MMM yyyy')}</p>
          <p className="flex items-center gap-1 text-sm font-medium text-foreground xl:justify-end">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {schedule.vehicle.return_time
              ? format(schedule.returnDate, 'hh:mm a')
              : 'Time not set'}
          </p>
          <p className={`text-sm font-medium mt-1 ${
            schedule.status === 'overdue' ? 'text-red-600' :
            schedule.status === 'due-today' ? 'text-amber-600' :
            schedule.status === 'due-tomorrow' ? 'text-orange-600' :
            schedule.status === 'due-soon' ? 'text-blue-600' :
            'text-muted-foreground'
          }`}>
            {getTimeRemaining(schedule)}
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <Card className="border-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Upcoming Returns & Schedules
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Last updated: {format(lastUpdated, 'HH:mm:ss')}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchSchedules}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className={`p-4 rounded-lg border-2 ${overdueCount > 0 ? 'border-red-500 bg-red-50' : 'border-muted bg-muted/30'}`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${overdueCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
              <span className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                {overdueCount}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Overdue Returns</p>
          </div>
          
          <div className={`p-4 rounded-lg border-2 ${dueTodayCount > 0 ? 'border-amber-500 bg-amber-50' : 'border-muted bg-muted/30'}`}>
            <div className="flex items-center gap-2">
              <Clock className={`h-5 w-5 ${dueTodayCount > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
              <span className={`text-2xl font-bold ${dueTodayCount > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                {dueTodayCount}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Due Today</p>
          </div>
          
          <div className={`p-4 rounded-lg border-2 ${dueSoonCount > 0 ? 'border-blue-500 bg-blue-50' : 'border-muted bg-muted/30'}`}>
            <div className="flex items-center gap-2">
              <CalendarClock className={`h-5 w-5 ${dueSoonCount > 0 ? 'text-blue-500' : 'text-muted-foreground'}`} />
              <span className={`text-2xl font-bold ${dueSoonCount > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                {dueSoonCount}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Due in 72 Hours</p>
          </div>
        </div>

        {/* Schedule List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Car className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No active rentals with scheduled returns</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Muscat & other branches */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="flex items-center gap-2 font-semibold">
                  <MapPin className="h-4 w-4 text-primary" />
                  Muscat &amp; Other Branches
                </h3>
                <Badge variant="secondary">{otherSchedules.length}</Badge>
              </div>
              {otherSchedules.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No returns scheduled</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {otherSchedules.map(renderScheduleItem)}
                </div>
              )}
            </div>

            {/* Salalah branch */}
            <div className="space-y-3 lg:border-l lg:pl-6">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="flex items-center gap-2 font-semibold">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  Salalah Branch
                </h3>
                <Badge className="bg-emerald-600 hover:bg-emerald-700">{salalahSchedules.length}</Badge>
              </div>
              {salalahSchedules.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No returns scheduled</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {salalahSchedules.map(renderScheduleItem)}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  Car, 
  ArrowRight,
  RefreshCw,
  User,
  MapPin
} from 'lucide-react'

interface ReturnSchedule {
  vehicle: Vehicle
  returnDate: Date
  status: 'overdue' | 'due-today' | 'due-tomorrow' | 'due-soon' | 'upcoming'
  hoursRemaining: number
  daysRemaining: number
}

export function ReturnsSummary() {
  const router = useRouter()
  const [schedules, setSchedules] = useState<ReturnSchedule[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
        const returnDate = new Date(vehicle.return_date!)
        // Apply expected return time if available
        if (vehicle.return_time) {
          const [h, m] = vehicle.return_time.split(':')
          returnDate.setHours(Number(h) || 0, Number(m) || 0, 0, 0)
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
  }

  useEffect(() => {
    fetchSchedules()
    const interval = setInterval(fetchSchedules, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const overdueCount = schedules.filter(s => s.status === 'overdue').length
  const dueTodayCount = schedules.filter(s => s.status === 'due-today').length
  const dueSoonCount = schedules.filter(s => s.status === 'due-tomorrow' || s.status === 'due-soon').length
  
  // Show at least the top 7 urgent returns when available
  const urgentReturns = schedules.slice(0, 7)

  const getStatusBadge = (status: ReturnSchedule['status']) => {
    switch (status) {
      case 'overdue':
        return (
          <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm animate-pulse text-xs px-2">
            OVERDUE
          </Badge>
        )
      case 'due-today':
        return (
          <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm text-xs px-2">
            TODAY
          </Badge>
        )
      case 'due-tomorrow':
        return (
          <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm text-xs px-2">
            TOMORROW
          </Badge>
        )
      case 'due-soon':
        return (
          <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm text-xs px-2">
            SOON
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-xs px-2">
            UPCOMING
          </Badge>
        )
    }
  }

  return (
    <Card className="border-2 shadow-sm overflow-hidden">
      <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-white pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-white shadow-sm">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <span>Upcoming Returns</span>
              <p className="text-sm font-normal text-muted-foreground">Real-time return schedule monitoring</p>
            </div>
          </CardTitle>
          <Button 
            onClick={() => router.push('/returns')}
            className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-sm"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            overdueCount > 0 
              ? 'bg-gradient-to-r from-red-50 to-red-100/50 border-2 border-red-200' 
              : 'bg-slate-50 border border-slate-200'
          }`}>
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              overdueCount > 0 ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                {overdueCount}
              </p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </div>
          
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            dueTodayCount > 0 
              ? 'bg-gradient-to-r from-amber-50 to-amber-100/50 border-2 border-amber-200' 
              : 'bg-slate-50 border border-slate-200'
          }`}>
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              dueTodayCount > 0 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${dueTodayCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                {dueTodayCount}
              </p>
              <p className="text-xs text-muted-foreground">Due Today</p>
            </div>
          </div>
          
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            dueSoonCount > 0 
              ? 'bg-gradient-to-r from-blue-50 to-blue-100/50 border-2 border-blue-200' 
              : 'bg-slate-50 border border-slate-200'
          }`}>
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              dueSoonCount > 0 ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${dueSoonCount > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                {dueSoonCount}
              </p>
              <p className="text-xs text-muted-foreground">Due Soon</p>
            </div>
          </div>
        </div>

        {/* Top 3 Urgent Returns */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : urgentReturns.length === 0 ? (
          <div className="text-center py-8 rounded-xl bg-slate-50 border border-dashed border-slate-200">
            <Car className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No scheduled returns</p>
            <p className="text-xs text-slate-400">All vehicles are currently available</p>
          </div>
        ) : (
          <div className="space-y-2">
            {urgentReturns.map((schedule) => (
              <div
                key={schedule.vehicle.id}
                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all hover:shadow-sm ${
                  schedule.status === 'overdue' 
                    ? 'border-red-200 bg-gradient-to-r from-red-50 to-white' 
                    : schedule.status === 'due-today' 
                    ? 'border-amber-200 bg-gradient-to-r from-amber-50 to-white' 
                    : schedule.status === 'due-tomorrow' 
                    ? 'border-orange-200 bg-gradient-to-r from-orange-50 to-white' 
                    : 'border-slate-200 bg-gradient-to-r from-slate-50 to-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    schedule.status === 'overdue' ? 'bg-red-100 text-red-600' :
                    schedule.status === 'due-today' ? 'bg-amber-100 text-amber-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    <Car className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">
                      {schedule.vehicle.make} {schedule.vehicle.model}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{schedule.vehicle.license_plate}</span>
                      <span className="text-slate-300">|</span>
                      <User className="h-3 w-3" />
                      <span>{schedule.vehicle.customer_name}</span>
                    </div>
                    {schedule.vehicle.expected_return_location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3" />
                        <span>Return to: {schedule.vehicle.expected_return_location}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium">{format(schedule.returnDate, 'dd MMM')}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3" />
                      {schedule.vehicle.return_time 
                        ? format(schedule.returnDate, 'hh:mm a') 
                        : 'No time set'}
                    </p>
                  </div>
                  {getStatusBadge(schedule.status)}
                </div>
              </div>
            ))}
            
            {schedules.length > 3 && (
              <div className="text-center pt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => router.push('/returns')}
                  className="text-primary hover:text-primary"
                >
                  +{schedules.length - 3} more scheduled returns
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

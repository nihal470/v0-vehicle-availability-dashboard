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
  RefreshCw
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
  
  // Show top 3 urgent returns
  const urgentReturns = schedules.slice(0, 3)

  const getStatusBadge = (status: ReturnSchedule['status']) => {
    switch (status) {
      case 'overdue':
        return <Badge className="bg-red-500 hover:bg-red-600 animate-pulse text-xs">OVERDUE</Badge>
      case 'due-today':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-xs">TODAY</Badge>
      case 'due-tomorrow':
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-xs">TOMORROW</Badge>
      case 'due-soon':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-xs">SOON</Badge>
      default:
        return <Badge variant="outline" className="text-xs">UPCOMING</Badge>
    }
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarClock className="h-5 w-5 text-primary" />
          Upcoming Returns
        </CardTitle>
        <Button 
          onClick={() => router.push('/returns')}
          className="gap-2"
        >
          View All
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent>
        {/* Quick Stats Row */}
        <div className="flex gap-4 mb-4">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${overdueCount > 0 ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'}`}>
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold">{overdueCount}</span>
            <span className="text-sm">Overdue</span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${dueTodayCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
            <Clock className="h-4 w-4" />
            <span className="font-semibold">{dueTodayCount}</span>
            <span className="text-sm">Due Today</span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${dueSoonCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'}`}>
            <CalendarClock className="h-4 w-4" />
            <span className="font-semibold">{dueSoonCount}</span>
            <span className="text-sm">Due Soon</span>
          </div>
        </div>

        {/* Top 3 Urgent Returns */}
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : urgentReturns.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No scheduled returns</p>
          </div>
        ) : (
          <div className="space-y-2">
            {urgentReturns.map((schedule) => (
              <div
                key={schedule.vehicle.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  schedule.status === 'overdue' ? 'border-red-300 bg-red-50' :
                  schedule.status === 'due-today' ? 'border-amber-300 bg-amber-50' :
                  schedule.status === 'due-tomorrow' ? 'border-orange-200 bg-orange-50' :
                  'border-muted bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">
                      {schedule.vehicle.make} {schedule.vehicle.model}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {schedule.vehicle.license_plate} - {schedule.vehicle.customer_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {format(schedule.returnDate, 'dd MMM')}
                  </span>
                  {getStatusBadge(schedule.status)}
                </div>
              </div>
            ))}
            
            {schedules.length > 3 && (
              <p className="text-center text-sm text-muted-foreground pt-2">
                +{schedules.length - 3} more scheduled returns
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

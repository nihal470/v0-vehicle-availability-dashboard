'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { Vehicle } from '@/lib/types'
import { format, differenceInDays } from 'date-fns'
import { ShieldAlert, FileWarning, Car, RefreshCw, CheckCircle2 } from 'lucide-react'

interface ExpiryItem {
  vehicle: Vehicle
  date: Date
  daysRemaining: number
  type: 'insurance' | 'mulkiya'
}

export function DocumentExpiry() {
  const [items, setItems] = useState<ExpiryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchExpiries = async () => {
    setIsLoading(true)
    const supabase = createClient()

    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('*')
      .neq('status', 'returned')
      .order('make, model')

    if (vehicles) {
      const now = new Date()
      const expiryItems: ExpiryItem[] = []

      vehicles.forEach((vehicle: Vehicle) => {
        if (vehicle.insurance_end_date) {
          expiryItems.push({
            vehicle,
            date: new Date(vehicle.insurance_end_date),
            daysRemaining: differenceInDays(new Date(vehicle.insurance_end_date), now),
            type: 'insurance',
          })
        }
        if (vehicle.mulkiya_renewal_date) {
          expiryItems.push({
            vehicle,
            date: new Date(vehicle.mulkiya_renewal_date),
            daysRemaining: differenceInDays(new Date(vehicle.mulkiya_renewal_date), now),
            type: 'mulkiya',
          })
        }
      })

      // Sort by soonest expiry first
      expiryItems.sort((a, b) => a.daysRemaining - b.daysRemaining)
      setItems(expiryItems)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchExpiries()
  }, [])

  // Only show items expiring within 60 days or already expired
  const relevantItems = items.filter((item) => item.daysRemaining <= 60)

  const getStatusColor = (days: number) => {
    if (days < 0) return 'text-destructive'
    if (days <= 7) return 'text-destructive'
    if (days <= 30) return 'text-amber-600'
    return 'text-muted-foreground'
  }

  const getBadge = (days: number) => {
    if (days < 0) return <Badge variant="destructive">Expired {Math.abs(days)}d ago</Badge>
    if (days <= 7) return <Badge variant="destructive">{days}d left</Badge>
    if (days <= 30) return <Badge className="bg-amber-500 hover:bg-amber-600">{days}d left</Badge>
    return <Badge variant="outline">{days}d left</Badge>
  }

  return (
    <Card>
      <CardHeader className="border-b bg-muted/30 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            Insurance & Mulkiya Expiry
            {relevantItems.length > 0 && (
              <Badge variant="secondary" className="ml-1">{relevantItems.length}</Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchExpiries} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {relevantItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <p className="text-sm">No documents expiring in the next 60 days</p>
          </div>
        ) : (
          <div className="divide-y max-h-[360px] overflow-y-auto">
            {relevantItems.map((item) => (
              <div
                key={`${item.vehicle.id}-${item.type}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    item.type === 'insurance' ? 'bg-blue-500/10' : 'bg-orange-500/10'
                  }`}>
                    {item.type === 'insurance' ? (
                      <ShieldAlert className="h-4 w-4 text-blue-600" />
                    ) : (
                      <FileWarning className="h-4 w-4 text-orange-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {item.vehicle.make} {item.vehicle.model}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{item.vehicle.license_plate}</span>
                      <span className="text-slate-300">|</span>
                      <span className="capitalize">{item.type}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-medium ${getStatusColor(item.daysRemaining)}`}>
                    {format(item.date, 'dd MMM yyyy')}
                  </p>
                  <div className="mt-0.5">{getBadge(item.daysRemaining)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

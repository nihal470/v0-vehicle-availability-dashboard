'use client'

import { Car, PlayCircle, PauseCircle, Warehouse, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { FleetStats } from '@/lib/types'

interface StatsCardsProps {
  stats: FleetStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const statItems = [
    {
      label: 'Total Vehicles',
      value: stats.totalVehicles,
      icon: Car,
      color: 'bg-primary text-primary-foreground',
    },
    {
      label: 'Running',
      value: stats.runningVehicles,
      icon: PlayCircle,
      color: 'bg-emerald-500 text-white',
    },
    {
      label: 'Idle',
      value: stats.idleVehicles,
      icon: PauseCircle,
      color: 'bg-amber-500 text-white',
    },
    {
      label: 'In Garage',
      value: stats.inGarage,
      icon: Warehouse,
      color: 'bg-slate-500 text-white',
    },
    {
      label: 'Available',
      value: stats.available,
      icon: CheckCircle,
      color: 'bg-sky-500 text-white',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {statItems.map((item) => (
        <Card key={item.label} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-4 p-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${item.color}`}>
                <item.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

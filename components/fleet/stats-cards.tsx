'use client'

import { Car, PlayCircle, PauseCircle, Warehouse, CheckCircle, Wrench } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { FleetStats, VehicleStatus } from '@/lib/types'

interface StatsCardsProps {
  stats: FleetStats
  selectedStatus: string
  onStatusChange: (status: string) => void
}

export function StatsCards({ stats, selectedStatus, onStatusChange }: StatsCardsProps) {
  const statItems: {
    label: string
    value: number
    icon: typeof Car
    color: string
    activeColor: string
    status: string
  }[] = [
    {
      label: 'All Vehicles',
      value: stats.totalVehicles,
      icon: Car,
      color: 'bg-primary/20 text-primary',
      activeColor: 'bg-primary text-primary-foreground',
      status: 'all',
    },
    {
      label: 'Running',
      value: stats.runningVehicles,
      icon: PlayCircle,
      color: 'bg-emerald-100 text-emerald-700',
      activeColor: 'bg-emerald-500 text-white',
      status: 'running',
    },
    {
      label: 'Idle',
      value: stats.idleVehicles,
      icon: PauseCircle,
      color: 'bg-amber-100 text-amber-700',
      activeColor: 'bg-amber-500 text-white',
      status: 'idle',
    },
    {
      label: 'In Garage',
      value: stats.inGarage,
      icon: Warehouse,
      color: 'bg-slate-100 text-slate-700',
      activeColor: 'bg-slate-500 text-white',
      status: 'garage',
    },
    {
      label: 'Reserved',
      value: stats.available,
      icon: CheckCircle,
      color: 'bg-sky-100 text-sky-700',
      activeColor: 'bg-sky-500 text-white',
      status: 'available',
    },
    {
      label: 'Service',
      value: stats.maintenance,
      icon: Wrench,
      color: 'bg-purple-100 text-purple-700',
      activeColor: 'bg-purple-500 text-white',
      status: 'maintenance',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {statItems.map((item) => {
        const isActive = selectedStatus === item.status
        return (
          <Card 
            key={item.label} 
            className={cn(
              "overflow-hidden cursor-pointer transition-all hover:shadow-md",
              isActive && "ring-2 ring-primary ring-offset-2"
            )}
            onClick={() => onStatusChange(item.status)}
          >
            <CardContent className="p-0">
              <div className="flex items-center gap-4 p-4">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-lg transition-colors",
                  isActive ? item.activeColor : item.color
                )}>
                  <item.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

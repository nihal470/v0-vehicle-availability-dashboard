'use client'

import { Car, PlayCircle, PauseCircle, Warehouse, CheckCircle, Wrench, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FleetStats } from '@/lib/types'

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
    gradient: string
    borderColor: string
    textColor: string
    status: string
    description: string
  }[] = [
    {
      label: 'Total Fleet',
      value: stats.totalVehicles,
      icon: Car,
      gradient: 'from-slate-600 to-slate-800',
      borderColor: 'border-slate-300',
      textColor: 'text-slate-600',
      status: 'all',
      description: 'All vehicles',
    },
    {
      label: 'Running',
      value: stats.runningVehicles,
      icon: PlayCircle,
      gradient: 'from-emerald-500 to-emerald-700',
      borderColor: 'border-emerald-300',
      textColor: 'text-emerald-600',
      status: 'running',
      description: 'Active rentals',
    },
    {
      label: 'Idle',
      value: stats.idleVehicles,
      icon: PauseCircle,
      gradient: 'from-amber-500 to-amber-700',
      borderColor: 'border-amber-300',
      textColor: 'text-amber-600',
      status: 'idle',
      description: 'Ready to use',
    },
    {
      label: 'In Garage',
      value: stats.inGarage,
      icon: Warehouse,
      gradient: 'from-slate-500 to-slate-700',
      borderColor: 'border-slate-300',
      textColor: 'text-slate-600',
      status: 'garage',
      description: 'Parked/stored',
    },
    {
      label: 'Reserved',
      value: stats.available,
      icon: CheckCircle,
      gradient: 'from-sky-500 to-sky-700',
      borderColor: 'border-sky-300',
      textColor: 'text-sky-600',
      status: 'available',
      description: 'Upcoming bookings',
    },
    {
      label: 'Service',
      value: stats.maintenance,
      icon: Wrench,
      gradient: 'from-purple-500 to-purple-700',
      borderColor: 'border-purple-300',
      textColor: 'text-purple-600',
      status: 'maintenance',
      description: 'In maintenance',
    },
  ]

  // Calculate utilization rate
  const utilizationRate = stats.totalVehicles > 0 
    ? Math.round((stats.runningVehicles / stats.totalVehicles) * 100) 
    : 0

  return (
    <div className="space-y-4">
      {/* Utilization Overview */}
      <div className="flex items-center gap-4 rounded-xl border bg-gradient-to-r from-slate-50 to-white p-4 shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-white shadow-md">
          <TrendingUp className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fleet Utilization</p>
              <p className="text-2xl font-bold">{utilizationRate}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                {stats.runningVehicles} of {stats.totalVehicles} vehicles active
              </p>
              <div className="mt-1 h-2 w-48 overflow-hidden rounded-full bg-slate-200">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                  style={{ width: `${utilizationRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {statItems.map((item) => {
          const isActive = selectedStatus === item.status
          const percentage = stats.totalVehicles > 0 
            ? Math.round((item.value / stats.totalVehicles) * 100) 
            : 0
          
          return (
            <button
              key={item.label}
              onClick={() => onStatusChange(item.status)}
              className={cn(
                "group relative overflow-hidden rounded-xl border-2 bg-white p-4 text-left transition-all duration-200 hover:shadow-lg",
                isActive 
                  ? `${item.borderColor} shadow-md ring-2 ring-offset-2` 
                  : "border-slate-200 hover:border-slate-300"
              )}
              style={isActive ? { '--tw-ring-color': item.borderColor.replace('border-', 'rgb(var(--') + ')' } as React.CSSProperties : undefined}
            >
              {/* Background Gradient on Hover */}
              <div className={cn(
                "absolute inset-0 opacity-0 transition-opacity group-hover:opacity-5",
                `bg-gradient-to-br ${item.gradient}`
              )} />
              
              {/* Icon */}
              <div className={cn(
                "mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-sm",
                `bg-gradient-to-br ${item.gradient}`
              )}>
                <item.icon className="h-5 w-5" />
              </div>
              
              {/* Value */}
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight">{item.value}</span>
                <span className="text-sm text-muted-foreground">({percentage}%)</span>
              </div>
              
              {/* Label & Description */}
              <p className={cn("font-semibold", item.textColor)}>{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
              
              {/* Active Indicator */}
              {isActive && (
                <div className={cn(
                  "absolute bottom-0 left-0 right-0 h-1",
                  `bg-gradient-to-r ${item.gradient}`
                )} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

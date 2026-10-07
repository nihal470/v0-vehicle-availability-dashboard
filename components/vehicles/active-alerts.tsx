'use client'

import { useMemo } from 'react'
import { Vehicle, VehicleAlert } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Shield, FileText, Wrench, CheckCircle2 } from 'lucide-react'
import { differenceInDays } from 'date-fns'

export function generateAlerts(vehicles: Vehicle[]): VehicleAlert[] {
  const alerts: VehicleAlert[] = []
  const today = new Date()

  vehicles.forEach((vehicle) => {
    // Insurance expiry alerts
    if (vehicle.insurance_end_date) {
      const daysUntilExpiry = differenceInDays(new Date(vehicle.insurance_end_date), today)
      if (daysUntilExpiry < 0) {
        alerts.push({
          vehicleId: vehicle.id,
          licensePlate: vehicle.license_plate,
          make: vehicle.make,
          model: vehicle.model,
          type: 'insurance',
          severity: 'critical',
          message: `Insurance expired ${Math.abs(daysUntilExpiry)} days ago`,
          daysRemaining: daysUntilExpiry,
        })
      } else if (daysUntilExpiry <= 30) {
        alerts.push({
          vehicleId: vehicle.id,
          licensePlate: vehicle.license_plate,
          make: vehicle.make,
          model: vehicle.model,
          type: 'insurance',
          severity: daysUntilExpiry <= 7 ? 'critical' : 'warning',
          message: `Insurance expires in ${daysUntilExpiry} days`,
          daysRemaining: daysUntilExpiry,
        })
      }
    }

    // Mulkiya renewal alerts
    if (vehicle.mulkiya_renewal_date) {
      const daysUntilRenewal = differenceInDays(new Date(vehicle.mulkiya_renewal_date), today)
      if (daysUntilRenewal < 0) {
        alerts.push({
          vehicleId: vehicle.id,
          licensePlate: vehicle.license_plate,
          make: vehicle.make,
          model: vehicle.model,
          type: 'mulkiya',
          severity: 'critical',
          message: `Mulkiya expired ${Math.abs(daysUntilRenewal)} days ago`,
          daysRemaining: daysUntilRenewal,
        })
      } else if (daysUntilRenewal <= 30) {
        alerts.push({
          vehicleId: vehicle.id,
          licensePlate: vehicle.license_plate,
          make: vehicle.make,
          model: vehicle.model,
          type: 'mulkiya',
          severity: daysUntilRenewal <= 7 ? 'critical' : 'warning',
          message: `Mulkiya renewal due in ${daysUntilRenewal} days`,
          daysRemaining: daysUntilRenewal,
        })
      }
    }

    // Service due by KM
    if (vehicle.current_km && vehicle.next_service_km) {
      const kmRemaining = vehicle.next_service_km - vehicle.current_km
      if (kmRemaining < 0) {
        alerts.push({
          vehicleId: vehicle.id,
          licensePlate: vehicle.license_plate,
          make: vehicle.make,
          model: vehicle.model,
          type: 'service_km',
          severity: 'critical',
          message: `Service overdue by ${Math.abs(kmRemaining).toLocaleString()} km`,
          kmRemaining,
        })
      } else if (kmRemaining <= 1000) {
        alerts.push({
          vehicleId: vehicle.id,
          licensePlate: vehicle.license_plate,
          make: vehicle.make,
          model: vehicle.model,
          type: 'service_km',
          severity: kmRemaining <= 500 ? 'critical' : 'warning',
          message: `Service due in ${kmRemaining.toLocaleString()} km`,
          kmRemaining,
        })
      }
    }

    // Service due by date
    if (vehicle.next_service_date) {
      const daysUntilService = differenceInDays(new Date(vehicle.next_service_date), today)
      if (daysUntilService < 0) {
        alerts.push({
          vehicleId: vehicle.id,
          licensePlate: vehicle.license_plate,
          make: vehicle.make,
          model: vehicle.model,
          type: 'service_date',
          severity: 'critical',
          message: `Service overdue by ${Math.abs(daysUntilService)} days`,
          daysRemaining: daysUntilService,
        })
      } else if (daysUntilService <= 14) {
        alerts.push({
          vehicleId: vehicle.id,
          licensePlate: vehicle.license_plate,
          make: vehicle.make,
          model: vehicle.model,
          type: 'service_date',
          severity: daysUntilService <= 7 ? 'critical' : 'warning',
          message: `Service due in ${daysUntilService} days`,
          daysRemaining: daysUntilService,
        })
      }
    }
  })

  // Sort by severity (critical first)
  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })
}

function getAlertIcon(type: VehicleAlert['type']) {
  switch (type) {
    case 'insurance':
      return <Shield className="h-4 w-4" />
    case 'mulkiya':
      return <FileText className="h-4 w-4" />
    case 'service_km':
    case 'service_date':
      return <Wrench className="h-4 w-4" />
  }
}

function getSeverityColor(severity: VehicleAlert['severity']) {
  switch (severity) {
    case 'critical':
      return 'bg-destructive text-destructive-foreground'
    case 'warning':
      return 'bg-accent text-accent-foreground'
    case 'info':
      return 'bg-muted text-muted-foreground'
  }
}

interface Props {
  vehicles: Vehicle[]
}

export function ActiveAlerts({ vehicles }: Props) {
  // Only monitor active fleet (exclude returned vehicles)
  const alerts = useMemo(
    () => generateAlerts(vehicles.filter((v) => v.status !== 'returned')),
    [vehicles],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Active Alerts ({alerts.length})
        </CardTitle>
        <p className="text-sm text-muted-foreground">Insurance, Mulkiya &amp; Service monitoring</p>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <p className="font-medium">All clear</p>
            <p className="text-sm text-muted-foreground">
              No insurance, mulkiya, or service alerts right now.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {alerts.map((alert, index) => (
              <div
                key={`${alert.vehicleId}-${alert.type}-${index}`}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  alert.severity === 'critical'
                    ? 'border-destructive/50 bg-destructive/5'
                    : 'border-accent/50 bg-accent/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${getSeverityColor(alert.severity)}`}>
                    {getAlertIcon(alert.type)}
                  </div>
                  <div>
                    <p className="font-medium">
                      {alert.make} {alert.model}
                      <span className="text-muted-foreground ml-2">({alert.licensePlate})</span>
                    </p>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                  </div>
                </div>
                <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                  {alert.type === 'insurance' && 'Insurance'}
                  {alert.type === 'mulkiya' && 'Mulkiya'}
                  {(alert.type === 'service_km' || alert.type === 'service_date') && 'Service'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

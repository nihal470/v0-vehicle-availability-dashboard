import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Wrench, ArrowLeft, CheckCircle2, AlertTriangle, Clock, DollarSign } from 'lucide-react'
import { VehicleServiceTracker } from '@/components/vehicle-service/vehicle-service-tracker'
import { ActiveAlerts } from '@/components/vehicles/active-alerts'
import type { ServiceRecord, Vehicle } from '@/lib/types'
import { computeServiceStatus } from '@/lib/service-status'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Vehicle Service Tracking',
  description: 'Track vehicle maintenance, service history, and upcoming service reminders',
}

export default async function VehicleServicePage() {
  const supabase = await createClient()

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .order('license_plate')

  const { data: records } = await supabase
    .from('service_records')
    .select('*, vehicle:vehicles(*)')
    .order('service_date', { ascending: false })

  const safeVehicles: Vehicle[] = vehicles || []
  const safeRecords: ServiceRecord[] = records || []

  // Latest service record per vehicle drives its current status
  const latestByVehicle = new Map<string, ServiceRecord>()
  for (const rec of safeRecords) {
    if (!latestByVehicle.has(rec.vehicle_id)) {
      latestByVehicle.set(rec.vehicle_id, rec)
    }
  }

  let upToDate = 0
  let dueSoon = 0
  let overdue = 0
  for (const vehicle of safeVehicles) {
    const latest = latestByVehicle.get(vehicle.id)
    const status = computeServiceStatus(
      latest?.next_service_date ?? vehicle.next_service_date,
      latest?.next_service_km ?? vehicle.next_service_km,
      vehicle.current_km,
    )
    if (status === 'overdue') overdue++
    else if (status === 'due_soon') dueSoon++
    else upToDate++
  }

  const now = new Date()
  const monthlyCost = safeRecords
    .filter((r) => {
      const d = new Date(r.service_date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, r) => sum + Number(r.cost || 0), 0)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wrench className="h-6 w-6" />
              Vehicle Service Tracking
            </h1>
            <p className="text-muted-foreground">
              Maintenance records, service history, and upcoming service reminders
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Up to Date</p>
                  <p className="text-2xl font-bold text-emerald-600">{upToDate}</p>
                </div>
                <div className="rounded-full bg-emerald-100 p-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={dueSoon > 0 ? 'border-amber-200 bg-amber-50/50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Due Soon</p>
                  <p className="text-2xl font-bold text-amber-600">{dueSoon}</p>
                </div>
                <div className="rounded-full bg-amber-100 p-3">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={overdue > 0 ? 'border-red-200 bg-red-50/50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">{overdue}</p>
                </div>
                <div className="rounded-full bg-red-100 p-3">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Month's Cost</p>
                  <p className="text-2xl font-bold">OMR {monthlyCost.toLocaleString()}</p>
                </div>
                <div className="rounded-full bg-blue-100 p-3">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <ActiveAlerts vehicles={safeVehicles} />

        <VehicleServiceTracker initialRecords={safeRecords} vehicles={safeVehicles} />
      </div>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Car, AlertTriangle, DollarSign, User, Clock, ArrowLeft, TrendingUp, FileText } from 'lucide-react'
import { TripLogs } from '@/components/vehicle-logs/trip-logs'
import { VehicleFines } from '@/components/vehicle-logs/vehicle-fines'

// Disable caching for real-time data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Vehicle Log Manager',
  description: 'Track driver usage and manage fines/violations',
}

export default async function VehicleLogsPage() {
  const supabase = await createClient()

  // Fetch vehicles
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .order('license_plate')

  // Fetch trip logs with vehicle info
  const { data: tripLogs } = await supabase
    .from('trip_logs')
    .select('*, vehicle:vehicles(*)')
    .order('trip_date', { ascending: false })
    .order('time_out', { ascending: false })

  // Fetch fines with vehicle info
  const { data: fines } = await supabase
    .from('vehicle_fines')
    .select('*, vehicle:vehicles(*)')
    .order('fine_date', { ascending: false })

  const safeVehicles = vehicles || []
  const safeTripLogs = tripLogs || []
  const safeFines = fines || []

  // Calculate statistics
  const totalTrips = safeTripLogs.length
  const tripsInProgress = safeTripLogs.filter(t => !t.time_in).length
  const uniqueDrivers = [...new Set(safeTripLogs.map(t => t.driver_name))].length
  
  const totalFines = safeFines.length
  const unpaidFines = safeFines.filter(f => f.payment_status === 'unpaid')
  const pendingFines = safeFines.filter(f => f.payment_status === 'pending')
  const totalUnpaidAmount = unpaidFines.reduce((sum, f) => sum + Number(f.fine_amount), 0)
  const totalPendingAmount = pendingFines.reduce((sum, f) => sum + Number(f.fine_amount), 0)
  const totalFinesAmount = safeFines.reduce((sum, f) => sum + Number(f.fine_amount), 0)

  // Driver stats
  const driverFines = safeFines.reduce((acc, fine) => {
    if (fine.driver_name) {
      acc[fine.driver_name] = (acc[fine.driver_name] || 0) + Number(fine.fine_amount)
    }
    return acc
  }, {} as Record<string, number>)

  const topOffenders = Object.entries(driverFines)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Vehicle Log Manager
              </h1>
              <p className="text-muted-foreground">Track driver usage and manage fines/violations</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Trips</p>
                  <p className="text-2xl font-bold">{totalTrips}</p>
                  {tripsInProgress > 0 && (
                    <Badge variant="secondary" className="mt-1 bg-blue-100 text-blue-700">
                      {tripsInProgress} in progress
                    </Badge>
                  )}
                </div>
                <div className="rounded-full bg-blue-100 p-3">
                  <Car className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Drivers</p>
                  <p className="text-2xl font-bold">{uniqueDrivers}</p>
                  <p className="text-xs text-muted-foreground mt-1">Unique drivers</p>
                </div>
                <div className="rounded-full bg-emerald-100 p-3">
                  <User className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Fines</p>
                  <p className="text-2xl font-bold">{totalFines}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    OMR {totalFinesAmount.toLocaleString()} total
                  </p>
                </div>
                <div className="rounded-full bg-amber-100 p-3">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={unpaidFines.length > 0 ? 'border-red-200 bg-red-50/50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Outstanding</p>
                  <p className="text-2xl font-bold text-red-600">
                    OMR {totalUnpaidAmount.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {unpaidFines.length} unpaid, {pendingFines.length} pending
                  </p>
                </div>
                <div className="rounded-full bg-red-100 p-3">
                  <DollarSign className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Offenders Card */}
        {topOffenders.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-600" />
                Top Fines by Driver
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {topOffenders.map(([driver, amount], index) => (
                  <div 
                    key={driver} 
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 bg-muted/30"
                  >
                    <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <span className="font-medium">{driver}</span>
                    <Badge variant="secondary" className="bg-red-100 text-red-700">
                      OMR {amount.toLocaleString()}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="trips" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trips" className="gap-2">
              <Car className="h-4 w-4" />
              Trip Logs
              <Badge variant="secondary" className="ml-1">{totalTrips}</Badge>
            </TabsTrigger>
            <TabsTrigger value="fines" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Fines & Violations
              {unpaidFines.length > 0 && (
                <Badge className="ml-1 bg-red-500">{unpaidFines.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trips">
            <TripLogs initialLogs={safeTripLogs} vehicles={safeVehicles} />
          </TabsContent>

          <TabsContent value="fines">
            <VehicleFines initialFines={safeFines} vehicles={safeVehicles} tripLogs={safeTripLogs} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

'use client'

import { ReturnsSummary } from './returns-summary'
import { ActiveAlerts } from '@/components/vehicles/active-alerts'
import { DocumentExpiry } from './document-expiry'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, ChevronRight, Info, Receipt } from 'lucide-react'
import Link from 'next/link'
import type { CategoryWithVehicles, Location, VehicleCategory, Vehicle } from '@/lib/types'

interface DashboardProps {
  initialCategories: CategoryWithVehicles[]
  locations: Location[]
  allCategories: VehicleCategory[]
  vehicles: Vehicle[]
}

export function Dashboard({ 
  initialCategories, 
  locations, 
  allCategories,
  vehicles
}: DashboardProps) {

  return (
    <div className="flex flex-col gap-6">
      {/* Returns & Stats Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ReturnsSummary />
        </div>
        <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/vehicle-logs" className="block">
              <Button variant="outline" className="w-full justify-between group hover:border-primary hover:bg-primary/5">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Trip Logs & Fines
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Button>
            </Link>
            <Link href="/payments" className="block">
              <Button variant="outline" className="w-full justify-between group hover:border-primary hover:bg-primary/5">
                <span className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  Payments & Receipts
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      
      {/* Insurance, Mulkiya & Service Monitoring */}
      <ActiveAlerts vehicles={vehicles} />

      {/* Document Expiry Section */}
      <DocumentExpiry />
    </div>
  )
}

'use client'

import { ReturnsSummary } from './returns-summary'
import { ActiveAlerts } from '@/components/vehicles/active-alerts'
import { DocumentExpiry } from './document-expiry'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, ChevronRight, Info, Receipt, Wallet, ClipboardCheck, FileSignature, Camera, CalendarClock } from 'lucide-react'
import Link from 'next/link'
import type { CategoryWithVehicles, Location, VehicleCategory, Vehicle } from '@/lib/types'

interface DashboardProps {
  initialCategories: CategoryWithVehicles[]
  locations: Location[]
  allCategories: VehicleCategory[]
  vehicles: Vehicle[]
  todayBookingsCount: number
}

function QuickAction({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return <Link href={href} className="block"><Button variant="outline" className="w-full justify-start gap-2 group hover:border-primary hover:bg-primary/5">{icon}{label}</Button></Link>
}

export function Dashboard({ 
  initialCategories, 
  locations, 
  allCategories,
  vehicles,
  todayBookingsCount,
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
            <div className="grid gap-2 sm:grid-cols-2">
              <QuickAction href="/accounting" label="Accounting" icon={<Wallet className="h-4 w-4 text-primary" />} />
              <Link href="/bookings?date=today" className="block sm:col-span-2">
                <Button variant="outline" className="w-full justify-between group border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/10">
                  <span className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary" />Today&apos;s Bookings</span>
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">{todayBookingsCount}</span>
                </Button>
              </Link>
              <QuickAction href="/contracts" label="Contracts" icon={<FileSignature className="h-4 w-4 text-primary" />} />
              <QuickAction href="/checkout" label="Checkout" icon={<Camera className="h-4 w-4 text-primary" />} />
              <QuickAction href="/returns" label="Returns" icon={<CalendarClock className="h-4 w-4 text-primary" />} />
            </div>
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

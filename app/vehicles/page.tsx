import { createClient } from '@/lib/supabase/server'
import { Vehicle } from '@/lib/types'
import { VehicleTrackingDashboard } from '@/components/vehicles/vehicle-tracking-dashboard'
import { Truck, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function VehiclesPage() {
  const supabase = await createClient()

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select(`
      *,
      category:vehicle_categories(*)
    `)
    .order('make', { ascending: true })

  const { data: categories } = await supabase
    .from('vehicle_categories')
    .select('*')
    .order('name', { ascending: true })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Truck className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">Vehicle Tracking</h1>
              <p className="text-sm text-sidebar-foreground/70">Insurance, Mulkiya & Service Monitoring</p>
            </div>
          </div>
          <Button
            asChild
            variant="secondary"
            className="bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80"
          >
            <Link href="/">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1800px] p-6">
        <VehicleTrackingDashboard 
          vehicles={(vehicles as Vehicle[]) || []} 
          categories={categories || []}
        />
      </main>
    </div>
  )
}

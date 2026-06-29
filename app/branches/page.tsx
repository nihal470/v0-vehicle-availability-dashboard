import { createClient } from '@/lib/supabase/server'
import { Vehicle, VehicleTransfer } from '@/lib/types'
import { BranchManagement } from '@/components/branches/branch-management'
import { Building2, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// Disable caching for real-time data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function BranchesPage() {
  const supabase = await createClient()

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select(`
      *,
      category:vehicle_categories(*)
    `)
    .order('make', { ascending: true })

  const { data: transfers } = await supabase
    .from('vehicle_transfers')
    .select(`
      *,
      vehicle:vehicles(id, make, model, license_plate)
    `)
    .order('transferred_at', { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">Branch Management</h1>
              <p className="text-sm text-sidebar-foreground/70">Muscat &amp; Salalah Fleet Distribution</p>
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
        <BranchManagement
          vehicles={(vehicles as Vehicle[]) || []}
          transfers={(transfers as VehicleTransfer[]) || []}
        />
      </main>
    </div>
  )
}

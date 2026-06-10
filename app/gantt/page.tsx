import { createClient } from '@/lib/supabase/server'
import { Vehicle } from '@/lib/types'
import { RentalGanttChart } from '@/components/fleet/rental-gantt-chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GanttChartSquare, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// Disable caching for real-time data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Rental Gantt Chart - Fleet Management',
  description: 'Monthly timeline of vehicle rental agreements',
}

export default async function GanttPage() {
  const supabase = await createClient()

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .not('start_date', 'is', null)
    .not('return_date', 'is', null)
    .order('make, model')

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1800px] space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <GanttChartSquare className="h-6 w-6" />
              Rental Gantt Chart
            </h1>
            <p className="text-muted-foreground">
              Monthly timeline of vehicle rental agreements
            </p>
          </div>
        </div>

        {/* Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Agreements Timeline</CardTitle>
            <CardDescription>
              Each bar shows a vehicle&apos;s rental agreement from start to return date. Use the
              arrows to navigate between months.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RentalGanttChart vehicles={(vehicles as Vehicle[]) || []} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

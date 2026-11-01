'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Camera, CarFront } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { InspectionCaptureModal } from '@/components/vehicles/inspection-capture-modal'
import type { Vehicle } from '@/lib/types'

export default function CheckoutPage() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [open, setOpen] = useState(false)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    createClient().from('vehicles').select('*, category:vehicle_categories(*)').order('make').then(({ data }) => {
      if (active) {
        setVehicles((data as Vehicle[]) ?? [])
        setLoading(false)
      }
    })
    return () => { active = false }
  }, [])

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Vehicle handover</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Checkout inspection</h1></div>
          <Button asChild variant="ghost"><Link href="/vehicles"><ArrowLeft data-icon="inline-start" /> Vehicles</Link></Button>
        </div>
      </header>
      <section className="mx-auto max-w-3xl px-6 py-12">
        <Card>
          <CardHeader><CardTitle>Capture vehicle condition</CardTitle><CardDescription>Choose a vehicle, photograph its condition, and record any damage before it leaves the fleet.</CardDescription></CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4"><CarFront className="size-5 text-primary" /><div><p className="font-medium">Vehicle checkout</p><p className="text-sm text-muted-foreground">The inspection will be saved as Checkout (Vehicle Out).</p></div></div>
            <div className="space-y-2"><label className="text-sm font-medium">Vehicle</label><Select value={vehicle?.id ?? ''} onValueChange={(id) => setVehicle(vehicles.find((item) => item.id === id) ?? null)}><SelectTrigger><SelectValue placeholder={loading ? 'Loading vehicles…' : 'Select a vehicle'} /></SelectTrigger><SelectContent>{vehicles.map((item) => <SelectItem key={item.id} value={item.id}>{item.make} {item.model} · {item.license_plate}</SelectItem>)}</SelectContent></Select></div>
            <Button className="w-full" size="lg" disabled={!vehicle} onClick={() => setOpen(true)}><Camera data-icon="inline-start" /> Start checkout inspection</Button>
          </CardContent>
        </Card>
      </section>
      {vehicle && <InspectionCaptureModal vehicle={vehicle} open={open} onOpenChange={setOpen} />}
    </main>
  )
}

import { createClient } from '@/lib/supabase/server'
import { getContracts } from '@/lib/contracts'
import { ContractsDashboard } from '@/components/contracts/contracts-dashboard'

export const dynamic = 'force-dynamic'

export default async function ContractsPage() {
  const supabase = await createClient()
  const [{ data: contracts }, { data: customers }, { data: vehicles }] = await Promise.all([
    supabase.from('contracts').select('*, customer:customers(name, mobile, email), vehicle:vehicles(make, model, license_plate), contract_signatories(*)').order('created_at', { ascending: false }),
    supabase.from('customers').select('id, name, email, mobile').order('name'),
    supabase.from('vehicles').select('id, make, model, license_plate').neq('status', 'returned').order('make, model'),
  ])
  return <main className="mx-auto max-w-7xl p-4 md:p-8"><ContractsDashboard initialContracts={(contracts ?? []) as never} customers={customers ?? []} vehicles={vehicles ?? []} /></main>
}

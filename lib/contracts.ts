'use client'

import { createClient } from '@/lib/supabase/client'

export type ContractStatus = 'draft' | 'sent' | 'partially_signed' | 'signed' | 'cancelled' | 'expired'

export type Contract = {
  id: string
  contract_no: string
  customer_id: string | null
  vehicle_id: string | null
  status: ContractStatus
  start_date: string
  end_date: string
  pickup_location: string | null
  return_location: string | null
  daily_rate: number
  total_amount: number
  deposit_amount: number
  currency: string
  terms: string
  notes: string | null
  created_at: string
  updated_at: string
  customer?: { name: string; mobile: string | null; email: string | null } | null
  vehicle?: { make: string; model: string; license_plate: string } | null
  contract_signatories?: Signatory[]
}

export type Signatory = {
  id: string
  contract_id: string
  name: string
  email: string | null
  mobile: string | null
  role: string
  signing_token: string
  status: 'pending' | 'signed' | 'declined'
  signature_data: string | null
  signed_at: string | null
}

export async function getContracts() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('contracts')
    .select('*, customer:customers(name, mobile, email), vehicle:vehicles(make, model, license_plate), contract_signatories(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Contract[]
}

export function nextContractNumber() {
  return `RC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
}

export function contractStatusLabel(status: ContractStatus) {
  return status.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

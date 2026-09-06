import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PrintContractButton } from '@/components/contracts/print-contract-button'
import { CopySigningLink } from '@/components/contracts/copy-signing-link'

export const dynamic = 'force-dynamic'

const printStyles = `@page { size: A4; margin: 14mm 12mm; } @media print { body { background: white !important; } article { width: 100%; max-width: none; } section { break-inside: avoid; } h1, h2, h3 { break-after: avoid; } img { max-width: 100%; } }`

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: contract } = await supabase
    .from('contracts')
    .select('*, customer:customers(name, mobile, email, address), vehicle:vehicles(make, model, license_plate, year, color), contract_signatories(*), contract_events(*)')
    .eq('id', id)
    .single()
  if (!contract) notFound()

  const customer = contract.customer as { name?: string; mobile?: string; email?: string; address?: string } | null
  const vehicle = contract.vehicle as { make?: string; model?: string; license_plate?: string; year?: string | number; color?: string } | null
  const signatories = (contract.contract_signatories ?? []) as Array<{ id: string; name: string; role: string; mobile?: string | null; signing_token: string; status: string; signature_data?: string | null; signed_at?: string | null }>
  const terms = String(contract.terms || '').split(/\n+/).filter(Boolean)

  return (
    <><style>{printStyles}</style><main className="min-h-screen bg-muted/30 px-4 py-6 md:px-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Button variant="ghost" asChild><Link href="/contracts"><ArrowLeft data-icon="inline-start" /> Back to Contracts</Link></Button>
          <PrintContractButton />
        </div>

        <article className="overflow-hidden border border-border bg-background shadow-sm print:border-0 print:shadow-none">
          <header className="border-b-4 border-primary px-6 py-7 md:px-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Travz Car Rental</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Car Hire Agreement</h1>
                <p className="mt-2 font-mono text-sm text-muted-foreground">{contract.contract_no}</p>
              </div>
              <div className="text-left sm:text-right"><Badge className="capitalize">{String(contract.status).replace('_', ' ')}</Badge><p className="mt-3 text-xs text-muted-foreground">Agreement document</p></div>
            </div>
          </header>

          <div className="space-y-8 px-6 py-7 md:px-10 md:py-9">
            <section>
              <SectionTitle eyebrow="01" title="Customer information" />
              <div className="mt-4 grid gap-x-8 gap-y-5 border-y py-5 sm:grid-cols-2 lg:grid-cols-4">
                <Info label="Name" value={customer?.name ?? '—'} />
                <Info label="Customer type" value="Individual" />
                <Info label="Phone no" value={customer?.mobile ?? '—'} />
                <Info label="Email" value={customer?.email ?? '—'} />
              </div>
            </section>

            <section>
              <SectionTitle eyebrow="02" title="Driver / renter" />
              <div className="mt-4 grid gap-x-8 gap-y-5 border-y py-5 sm:grid-cols-2 lg:grid-cols-4">
                <Info label="Name" value={customer?.name ?? signatories[0]?.name ?? '—'} />
                <Info label="Phone no" value={customer?.mobile ?? signatories[0]?.mobile ?? '—'} />
                <Info label="Driving license number" value="—" />
                <Info label="License expiry date" value="—" />
              </div>
            </section>

            <section>
              <SectionTitle eyebrow="03" title="Vehicle information" />
              <div className="mt-4 grid gap-x-8 gap-y-5 border-y py-5 sm:grid-cols-2 lg:grid-cols-5">
                <Info label="Car model" value={vehicle ? `${vehicle.make ?? ''} ${vehicle.model ?? ''}` : '—'} />
                <Info label="Plate no" value={vehicle?.license_plate ?? '—'} />
                <Info label="Color" value={vehicle?.color ?? '—'} />
                <Info label="Year" value={String(vehicle?.year ?? '—')} />
                <Info label="Fuel type" value="Gasoline" />
              </div>
            </section>

            <section>
              <SectionTitle eyebrow="04" title="Vehicle condition — handover & return" />
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <ConditionCard title="Car condition at handover" date={contract.start_date} status="Recorded at checkout" />
                <ConditionCard title="Condition at return" date={contract.end_date} status="Return not recorded yet" pending />
              </div>
              <p className="mt-4 border-l-2 border-primary bg-muted/40 px-4 py-3 text-sm leading-6 text-muted-foreground">I — as the renter — acknowledge receipt of the vehicle in the condition shown above. Any damage recorded on return beyond this state is my responsibility.</p>
            </section>

            <section>
              <SectionTitle eyebrow="05" title="Order details" />
              <div className="mt-4 grid gap-x-8 gap-y-5 border-y py-5 sm:grid-cols-2 lg:grid-cols-4">
                <Info label="Contract start date" value={String(contract.start_date)} />
                <Info label="Contract end date" value={String(contract.end_date)} />
                <Info label="Number of days" value={String(Math.max(1, Math.ceil((new Date(contract.end_date).getTime() - new Date(contract.start_date).getTime()) / 86400000)))} />
                <Info label="Daily kms" value="Unlimited kilometers" />
                <Info label="Daily price" value={`${contract.currency} ${Number(contract.daily_rate).toFixed(3)}`} />
                <Info label="Total" value={`${contract.currency} ${Number(contract.total_amount).toFixed(3)}`} strong />
                <Info label="Deposit" value={`${contract.currency} ${Number(contract.deposit_amount).toFixed(3)}`} />
                <Info label="Pickup / return" value={`${contract.pickup_location ?? '—'} / ${contract.return_location ?? '—'}`} />
              </div>
            </section>

            <section>
              <SectionTitle eyebrow="06" title="Terms and conditions" />
              <div className="mt-4 border-y py-5 text-sm leading-7 text-muted-foreground">
                {terms.length > 0 ? <ol className="list-decimal space-y-2 pl-5">{terms.map((term: string, index: number) => <li key={`${index}-${term}`}>{term.replace(/^\d+[.)]\s*/, '')}</li>)}</ol> : <p>No additional terms recorded.</p>}
              </div>
            </section>

            <section>
              <SectionTitle eyebrow="07" title="Acknowledgment and signatures" />
              <p className="mt-4 text-sm leading-7 text-muted-foreground">By signing this agreement, the renter confirms that they have read and accepted the terms and conditions, received the vehicle in the condition shown above, and agree to pay all applicable rental fees, traffic fines, and damage charges.</p>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {signatories.map((signer) => <div key={signer.id} className="min-h-48 border p-5"><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Customer signature</p><p className="mt-3 font-semibold">{signer.name}</p>{signer.signature_data ? <img src={signer.signature_data} alt={`${signer.name} signature`} className="mt-4 h-24 w-full object-contain object-left" /> : <div className="mt-12 border-b border-foreground/30" />}<div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{signer.status === 'signed' ? 'Signed electronically' : 'Awaiting signature'}</p>{signer.status === 'pending' && <CopySigningLink token={signer.signing_token} />}</div></div>)}
                <div className="min-h-48 border p-5"><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Company representative</p><p className="mt-3 font-semibold">Travz Car Rental</p><div className="mt-16 border-b border-foreground/30" /><p className="mt-3 text-xs text-muted-foreground">Authorized signature</p></div>
              </div>
            </section>
          </div>

          <footer className="border-t bg-muted/30 px-6 py-5 text-center text-xs text-muted-foreground md:px-10 print:bg-white">Travz Car Rental · Official rental agreement · {contract.contract_no}</footer>
        </article>
      </div>
    </main></>
  )
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) { return <div className="flex items-baseline gap-3"><span className="font-mono text-xs font-bold text-primary">{eyebrow}</span><h2 className="text-lg font-bold tracking-tight">{title}</h2></div> }
function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) { return <div><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p><p className={strong ? 'mt-1 text-lg font-bold text-primary' : 'mt-1 font-medium'}>{value}</p></div> }
function ConditionCard({ title, date, status, pending }: { title: string; date: string; status: string; pending?: boolean }) { return <div className="border p-5"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{title}</h3><span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{pending ? 'Pending' : 'Recorded'}</span></div><div className="mt-6 grid grid-cols-2 gap-4 text-sm"><div><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Date</p><p className="mt-1 font-medium">{date}</p></div><div><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Status</p><p className="mt-1 font-medium">{status}</p></div></div></div> }

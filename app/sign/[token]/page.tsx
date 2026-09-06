'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, Eraser, FileSignature, Loader2 } from 'lucide-react'

export default function SignContractPage({ params }: { params: Promise<{ token: string }> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [token, setToken] = useState('')
  const [contract, setContract] = useState<any>(null)
  const [accepted, setAccepted] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { params.then(({ token: value }) => setToken(value)) }, [params])
  useEffect(() => { if (!token) return; createClient().from('contract_signatories').select('*, contract:contracts(*)').eq('signing_token', token).single().then(({ data, error: queryError }) => { if (queryError) setError('This signing link is invalid or expired.'); else setContract(data) }) }, [token])

  function point(event: React.PointerEvent<HTMLCanvasElement>) { const canvas = canvasRef.current; if (!canvas) return null; const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height } }
  function start(event: React.PointerEvent<HTMLCanvasElement>) { const ctx = canvasRef.current?.getContext('2d'); const position = point(event); if (!ctx || !position) return; ctx.beginPath(); ctx.moveTo(position.x, position.y); setDrawing(true); event.currentTarget.setPointerCapture(event.pointerId) }
  function move(event: React.PointerEvent<HTMLCanvasElement>) { if (!drawing) return; const ctx = canvasRef.current?.getContext('2d'); const position = point(event); if (!ctx || !position) return; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#111827'; ctx.lineTo(position.x, position.y); ctx.stroke() }
  function clear() { const canvas = canvasRef.current; canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height) }
  async function submit() { const canvas = canvasRef.current; if (!canvas || !accepted || !contract) return; setSaving(true); setError(''); const supabase = createClient(); const signature = canvas.toDataURL('image/png'); const { error: updateError } = await supabase.from('contract_signatories').update({ status: 'signed', signature_data: signature, signed_at: new Date().toISOString() }).eq('id', contract.id).eq('signing_token', token); if (updateError) setError(updateError.message); else { await supabase.from('contract_events').insert({ contract_id: contract.contract_id, event_type: 'signed', description: `${contract.name} signed the agreement`, actor_name: contract.name }); setDone(true) } setSaving(false) }

  if (error) return <main className="grid min-h-dvh place-items-center p-6"><Card className="w-full max-w-md"><CardContent className="p-8 text-center"><FileSignature className="mx-auto size-10 text-destructive" /><h1 className="mt-4 text-xl font-semibold">Signing link unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p></CardContent></Card></main>
  if (!contract) return <main className="grid min-h-dvh place-items-center"><Loader2 className="size-8 animate-spin text-primary" /></main>
  if (done) return <main className="grid min-h-dvh place-items-center p-6"><Card className="w-full max-w-md"><CardContent className="p-8 text-center"><CheckCircle2 className="mx-auto size-12 text-primary" /><h1 className="mt-4 text-2xl font-semibold">Agreement signed</h1><p className="mt-2 text-muted-foreground">Thank you, {contract.name}. Your signature has been recorded.</p></CardContent></Card></main>
  const details = contract.contract
  return <main className="min-h-dvh bg-muted/30 p-4 md:p-8"><div className="mx-auto flex max-w-3xl flex-col gap-6"><Card><CardHeader><p className="text-sm font-medium text-primary">Travz Car Rental</p><CardTitle>Review and sign rental agreement</CardTitle><p className="text-sm text-muted-foreground">Signing as {contract.name}</p></CardHeader><CardContent className="flex flex-col gap-6"><div className="grid gap-4 rounded-xl bg-muted/50 p-4 sm:grid-cols-2"><Info label="Contract" value={details.contract_no} /><Info label="Vehicle" value={details.vehicle_id ?? 'Assigned vehicle'} /><Info label="Rental period" value={`${details.start_date} to ${details.end_date}`} /><Info label="Total" value={`${details.currency} ${Number(details.total_amount).toFixed(3)}`} /></div><section><h2 className="font-semibold">Terms and conditions</h2><Textarea readOnly value={details.terms} className="mt-3 min-h-44 resize-none" /></section><section><div className="flex items-center justify-between"><h2 className="font-semibold">Your signature</h2><Button variant="outline" size="sm" onClick={clear}><Eraser data-icon="inline-start" /> Clear</Button></div><canvas ref={canvasRef} width={900} height={260} className="mt-3 h-48 w-full touch-none rounded-xl border-2 border-dashed bg-background" onPointerDown={start} onPointerMove={move} onPointerUp={() => setDrawing(false)} onPointerLeave={() => setDrawing(false)} /></section><label className="flex items-start gap-3 rounded-lg border p-4 text-sm"><Checkbox checked={accepted} onCheckedChange={(value) => setAccepted(value === true)} /><span>I have read and agree to the rental agreement terms.</span></label>{error && <p className="text-sm text-destructive">{error}</p>}<Button className="w-full" size="lg" disabled={!accepted || saving} onClick={submit}>{saving ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <FileSignature data-icon="inline-start" />}{saving ? 'Submitting signature...' : 'Sign agreement'}</Button></CardContent></Card></div></main>
}
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div> }

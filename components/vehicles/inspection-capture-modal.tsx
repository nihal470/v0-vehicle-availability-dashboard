'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { compressImage, getCurrentLocation, type GpsResult } from '@/lib/image-compression'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Camera, Upload, X, MapPin, Loader2, CheckCircle2, AlertCircle, Trash2, ImageIcon } from 'lucide-react'
import type { Vehicle, InspectionType } from '@/lib/types'

interface Props {
  vehicle: Vehicle
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface StagedPhoto {
  id: string
  file: File
  previewUrl: string
}

const BUCKET = 'inspection-photos'

export function InspectionCaptureModal({ vehicle, open, onOpenChange }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [inspectionType, setInspectionType] = useState<InspectionType>('checkout')
  const [staged, setStaged] = useState<StagedPhoto[]>([])
  const [notes, setNotes] = useState('')
  const [gps, setGps] = useState<GpsResult | null>(null)
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'done' | 'denied'>('idle')
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Request GPS as soon as the modal opens
  useEffect(() => {
    if (open) {
      setGpsStatus('locating')
      getCurrentLocation().then((result) => {
        setGps(result)
        setGpsStatus(result ? 'done' : 'denied')
      })
    } else {
      // Reset state on close
      setStaged((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.previewUrl))
        return []
      })
      setNotes('')
      setGps(null)
      setGpsStatus('idle')
      setError(null)
      setProgress(null)
      setInspectionType('checkout')
    }
  }, [open])

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const newPhotos: StagedPhoto[] = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }))
    setStaged((prev) => [...prev, ...newPhotos])
  }, [])

  const removeStaged = (id: string) => {
    setStaged((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((p) => p.id !== id)
    })
  }

  const handleUpload = async () => {
    if (staged.length === 0) {
      setError('Please add at least one photo.')
      return
    }
    setIsUploading(true)
    setError(null)
    setProgress({ done: 0, total: staged.length })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const capturedAt = new Date().toISOString()

      for (let i = 0; i < staged.length; i++) {
        const photo = staged[i]
        const { blob, width, height } = await compressImage(photo.file)

        const safeAg = (vehicle.ag_no || 'no-ag').replace(/[^a-zA-Z0-9-_]/g, '_')
        const path = `${vehicle.id}/${safeAg}/${inspectionType}/${Date.now()}-${i}.jpg`

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

        const { error: insertError } = await supabase.from('inspection_photos').insert({
          vehicle_id: vehicle.id,
          ag_no: vehicle.ag_no,
          customer_name: vehicle.customer_name,
          inspection_type: inspectionType,
          storage_path: path,
          public_url: urlData.publicUrl,
          file_name: photo.file.name,
          mime_type: 'image/jpeg',
          file_size: blob.size,
          width,
          height,
          captured_at: capturedAt,
          gps_latitude: gps?.latitude ?? null,
          gps_longitude: gps?.longitude ?? null,
          gps_accuracy: gps?.accuracy ?? null,
          user_id: user?.id ?? null,
          user_email: user?.email ?? null,
          notes: notes.trim() || null,
        })
        if (insertError) throw insertError

        setProgress({ done: i + 1, total: staged.length })
      }

      router.refresh()
      onOpenChange(false)
    } catch (err) {
      console.error('[v0] Inspection upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !isUploading && onOpenChange(o)}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Vehicle Inspection
          </DialogTitle>
          <DialogDescription>
            {vehicle.make} {vehicle.model} · {vehicle.license_plate}
            {vehicle.ag_no ? ` · AG ${vehicle.ag_no}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Inspection type */}
          <div className="space-y-2">
            <Label>Inspection Type</Label>
            <Select value={inspectionType} onValueChange={(v) => setInspectionType(v as InspectionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checkout">Checkout (Vehicle Out)</SelectItem>
                <SelectItem value="checkin">Check-in (Vehicle Return)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* GPS status */}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className={`h-4 w-4 ${gpsStatus === 'done' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
            {gpsStatus === 'locating' && <span className="text-muted-foreground">Getting location…</span>}
            {gpsStatus === 'done' && gps && (
              <span className="text-muted-foreground">
                {gps.latitude.toFixed(5)}, {gps.longitude.toFixed(5)} (±{Math.round(gps.accuracy)}m)
              </span>
            )}
            {gpsStatus === 'denied' && <span className="text-muted-foreground">Location unavailable</span>}
          </div>

          {/* Capture buttons */}
          <div className="grid grid-cols-2 gap-3">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
            />
            <Button type="button" variant="outline" className="h-auto py-4 flex-col gap-1" onClick={() => cameraInputRef.current?.click()}>
              <Camera className="h-6 w-6" />
              <span className="text-xs">Take Photo</span>
            </Button>
            <Button type="button" variant="outline" className="h-auto py-4 flex-col gap-1" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-6 w-6" />
              <span className="text-xs">Upload Files</span>
            </Button>
          </div>

          {/* Staged previews */}
          {staged.length > 0 ? (
            <div className="space-y-2">
              <Label>{staged.length} photo{staged.length > 1 ? 's' : ''} ready</Label>
              <div className="grid grid-cols-3 gap-2">
                {staged.map((p) => (
                  <div key={p.id} className="relative group aspect-square overflow-hidden rounded-md border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.previewUrl || "/placeholder.svg"} alt="Inspection preview" className="h-full w-full object-cover" />
                    {!isUploading && (
                      <button
                        type="button"
                        onClick={() => removeStaged(p.id)}
                        className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove photo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed py-8 text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
              <span className="text-sm">No photos added yet</span>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="inspection-notes">Notes (optional)</Label>
            <Textarea
              id="inspection-notes"
              placeholder="Existing damage, scratches, fuel level, mileage…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {progress && isUploading && (
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading {progress.done} of {progress.total}…
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            className="w-full sm:w-auto"
            onClick={handleUpload}
            disabled={isUploading || staged.length === 0}
          >
            {isUploading ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving…</>
            ) : (
              <><CheckCircle2 className="h-4 w-4 mr-1" /> Save {staged.length > 0 ? `${staged.length} ` : ''}Photo{staged.length !== 1 ? 's' : ''}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

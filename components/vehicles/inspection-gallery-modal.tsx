'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Camera, MapPin, Clock, User, Loader2, ImageIcon, X, Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import type { Vehicle, InspectionPhoto } from '@/lib/types'

interface Props {
  vehicle: Vehicle
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddPhotos?: () => void
}

export function InspectionGalleryModal({ vehicle, open, onOpenChange, onAddPhotos }: Props) {
  const supabase = createClient()
  const [photos, setPhotos] = useState<InspectionPhoto[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const fetchPhotos = useCallback(async () => {
    setIsLoading(true)
    // Match by vehicle, scoped to the current agreement number when present
    let query = supabase
      .from('inspection_photos')
      .select('*')
      .eq('vehicle_id', vehicle.id)
      .order('captured_at', { ascending: false })

    if (vehicle.ag_no) {
      query = query.eq('ag_no', vehicle.ag_no)
    }

    const { data, error } = await query
    if (!error && data) setPhotos(data as InspectionPhoto[])
    setIsLoading(false)
  }, [supabase, vehicle.id, vehicle.ag_no])

  useEffect(() => {
    if (open) fetchPhotos()
    else { setPhotos([]); setLightboxIndex(null) }
  }, [open, fetchPhotos])

  const lightboxPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null

  const showPrev = () => setLightboxIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length))
  const showNext = () => setLightboxIndex((i) => (i === null ? null : (i + 1) % photos.length))

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Inspection Photos
            </DialogTitle>
            <DialogDescription>
              {vehicle.make} {vehicle.model} · {vehicle.license_plate}
              {vehicle.ag_no ? ` · AG ${vehicle.ag_no}` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              {isLoading ? 'Loading…' : `${photos.length} photo${photos.length !== 1 ? 's' : ''} on record`}
            </span>
            {onAddPhotos && (
              <Button size="sm" onClick={() => { onOpenChange(false); onAddPhotos() }}>
                <Camera className="h-4 w-4 mr-1" />
                Add Photos
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed py-12 text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
              <span className="text-sm">No inspection photos for this agreement yet</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  className="group flex flex-col gap-1 text-left"
                  onClick={() => setLightboxIndex(index)}
                >
                  <div className="relative aspect-square overflow-hidden rounded-md border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.public_url || "/placeholder.svg"}
                      alt={`${photo.inspection_type} inspection`}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      crossOrigin="anonymous"
                    />
                    <Badge
                      className={`absolute top-1 left-1 text-[10px] ${photo.inspection_type === 'checkout' ? 'bg-blue-600' : 'bg-emerald-600'}`}
                    >
                      {photo.inspection_type === 'checkout' ? 'OUT' : 'IN'}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {format(new Date(photo.captured_at), 'dd MMM yyyy, HH:mm')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox with metadata for claims/disputes */}
      <Dialog open={lightboxPhoto !== null} onOpenChange={(o) => !o && setLightboxIndex(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-4xl max-h-[95vh] overflow-y-auto p-0">
          {lightboxPhoto && (
            <div className="flex flex-col">
              <div className="relative bg-black flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lightboxPhoto.public_url || "/placeholder.svg"}
                  alt={`${lightboxPhoto.inspection_type} inspection`}
                  className="max-h-[60vh] w-auto object-contain"
                  crossOrigin="anonymous"
                />
                {photos.length > 1 && (
                  <>
                    <button onClick={showPrev} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70" aria-label="Previous photo">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button onClick={showNext} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70" aria-label="Next photo">
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
                <button onClick={() => setLightboxIndex(null)} className="absolute top-2 right-2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Metadata panel */}
              <div className="p-4 sm:p-6 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge className={lightboxPhoto.inspection_type === 'checkout' ? 'bg-blue-600' : 'bg-emerald-600'}>
                    {lightboxPhoto.inspection_type === 'checkout' ? 'Checkout (Out)' : 'Check-in (Return)'}
                  </Badge>
                  <Button size="sm" variant="outline" asChild>
                    <a href={lightboxPhoto.public_url} target="_blank" rel="noopener noreferrer" download>
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </a>
                  </Button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{format(new Date(lightboxPhoto.captured_at), 'dd MMM yyyy, HH:mm:ss')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{lightboxPhoto.ag_no ? `AG ${lightboxPhoto.ag_no}` : 'No agreement'}{lightboxPhoto.customer_name ? ` · ${lightboxPhoto.customer_name}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    {lightboxPhoto.gps_latitude != null && lightboxPhoto.gps_longitude != null ? (
                      <a
                        href={`https://www.google.com/maps?q=${lightboxPhoto.gps_latitude},${lightboxPhoto.gps_longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        {lightboxPhoto.gps_latitude.toFixed(5)}, {lightboxPhoto.gps_longitude.toFixed(5)}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">No location</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{lightboxPhoto.user_email || 'Unknown user'}</span>
                  </div>
                </div>

                {lightboxPhoto.notes && (
                  <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                    <span className="font-medium">Notes: </span>{lightboxPhoto.notes}
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  {lightboxPhoto.width && lightboxPhoto.height ? `${lightboxPhoto.width}×${lightboxPhoto.height}px · ` : ''}
                  {lightboxPhoto.file_size ? `${(lightboxPhoto.file_size / 1024).toFixed(0)} KB · ` : ''}
                  {lightboxPhoto.mime_type || ''}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

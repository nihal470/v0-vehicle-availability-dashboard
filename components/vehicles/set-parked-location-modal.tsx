'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/image-compression'
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
import { Input } from '@/components/ui/input'
import { MapPin, Car, Plane, Building2, Camera, Upload, X, Loader2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Vehicle } from '@/lib/types'

interface Props {
  vehicle: Vehicle
  open: boolean
  onOpenChange: (open: boolean) => void
}

const parkedLocationOptions = [
  { value: 'car_wash', label: 'Car Wash', icon: Car },
  { value: 'airport', label: 'Airport', icon: Plane },
  { value: 'office_front', label: 'Office Front', icon: Building2 },
  { value: 'custom', label: 'Custom Location', icon: MapPin },
]

const BUCKET = 'inspection-photos'

export function SetParkedLocationModal({ vehicle, open, onOpenChange }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [parkedLocation, setParkedLocation] = useState<string>('')
  const [parkedLocationCustom, setParkedLocationCustom] = useState('')
  // Photo: either an existing saved URL, or a newly staged file
  const [existingPhoto, setExistingPhoto] = useState<string | null>(null)
  const [stagedFile, setStagedFile] = useState<File | null>(null)
  const [stagedPreview, setStagedPreview] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)

  // Pre-fill with the vehicle's existing parked location when opened
  useEffect(() => {
    if (open) {
      setParkedLocation(vehicle.parked_location || '')
      setParkedLocationCustom(vehicle.parked_location_custom || '')
      setExistingPhoto(vehicle.parked_location_photo || null)
      setStagedFile(null)
      setStagedPreview(null)
      setRemovePhoto(false)
    }
  }, [open, vehicle])

  const handleAddFile = (files: FileList | null) => {
    const file = files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    if (stagedPreview) URL.revokeObjectURL(stagedPreview)
    setStagedFile(file)
    setStagedPreview(URL.createObjectURL(file))
    setRemovePhoto(false)
  }

  const clearPhoto = () => {
    if (stagedPreview) URL.revokeObjectURL(stagedPreview)
    setStagedFile(null)
    setStagedPreview(null)
    setExistingPhoto(null)
    setRemovePhoto(true)
  }

  const handleSubmit = async () => {
    setIsLoading(true)

    try {
      let photoUrl: string | null = vehicle.parked_location_photo || null
      let photoPath: string | null = vehicle.parked_location_photo_path || null

      // Remove existing photo from storage if the user cleared it
      if ((removePhoto || stagedFile) && vehicle.parked_location_photo_path) {
        await supabase.storage.from(BUCKET).remove([vehicle.parked_location_photo_path])
        photoUrl = null
        photoPath = null
      }

      // Upload a newly staged photo
      if (stagedFile) {
        const { blob } = await compressImage(stagedFile)
        const path = `${vehicle.id}/parking/${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
        photoUrl = urlData.publicUrl
        photoPath = path
      }

      const { error } = await supabase
        .from('vehicles')
        .update({
          parked_location: parkedLocation || null,
          parked_location_custom: parkedLocation === 'custom' ? parkedLocationCustom : null,
          parked_location_photo: photoUrl,
          parked_location_photo_path: photoPath,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vehicle.id)

      if (error) throw error

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error setting parked location:', error)
      alert('Failed to set parked location. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const currentPhoto = stagedPreview || existingPhoto

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set Parked Location</DialogTitle>
          <DialogDescription>
            Set where {vehicle.make} {vehicle.model} ({vehicle.license_plate}) is parked
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2 text-amber-700">
            <MapPin className="h-4 w-4" />
            <Label className="font-medium">Parked Location</Label>
          </div>
          <Select value={parkedLocation} onValueChange={setParkedLocation}>
            <SelectTrigger>
              <SelectValue placeholder="Select parked location" />
            </SelectTrigger>
            <SelectContent>
              {parkedLocationOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <option.icon className="h-4 w-4" />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {parkedLocation === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="customLocation">Custom Location</Label>
              <Input
                id="customLocation"
                placeholder="Enter custom location..."
                value={parkedLocationCustom}
                onChange={(e) => setParkedLocationCustom(e.target.value)}
              />
            </div>
          )}

          {/* Optional parking photo */}
          <div className="space-y-2">
            <Label>Parking Photo (optional)</Label>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { handleAddFile(e.target.files); e.target.value = '' }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { handleAddFile(e.target.files); e.target.value = '' }}
            />

            {currentPhoto ? (
              <div className="relative w-full overflow-hidden rounded-md border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentPhoto || "/placeholder.svg"} alt="Parking location" className="w-full max-h-48 object-cover" />
                {!isLoading && (
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                    aria-label="Remove photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => cameraInputRef.current?.click()}>
                  <Camera className="h-5 w-5" />
                  <span className="text-xs">Take Photo</span>
                </Button>
                <Button type="button" variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-5 w-5" />
                  <span className="text-xs">Upload</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !parkedLocation || (parkedLocation === 'custom' && !parkedLocationCustom.trim())}
          >
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...</>
            ) : (
              'Save Location'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

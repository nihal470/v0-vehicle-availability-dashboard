// Client-side image compression using canvas.
// Resizes to a max dimension and re-encodes as JPEG to reduce upload size.

export interface CompressedImage {
  blob: Blob
  width: number
  height: number
}

export async function compressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.7,
): Promise<CompressedImage> {
  const dataUrl = await readFileAsDataUrl(file)
  const img = await loadImage(dataUrl)

  let { width, height } = img
  if (width > maxDimension || height > maxDimension) {
    if (width >= height) {
      height = Math.round((height / width) * maxDimension)
      width = maxDimension
    } else {
      width = Math.round((width / height) * maxDimension)
      height = maxDimension
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    // Fallback: return original file as blob
    return { blob: file, width: img.width, height: img.height }
  }
  ctx.drawImage(img, 0, 0, width, height)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  )

  if (!blob) {
    return { blob: file, width, height }
  }

  return { blob, width, height }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// Attempt to get the device's current GPS location.
export interface GpsResult {
  latitude: number
  longitude: number
  accuracy: number
}

export function getCurrentLocation(): Promise<GpsResult | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    )
  })
}

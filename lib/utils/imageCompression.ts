import {
  ALLOWED_IMAGE_TYPES,
  MAX_UNCOMPRESSED_IMAGE_SIZE_BYTES,
  MAX_UNCOMPRESSED_IMAGE_SIZE_MB,
  IMAGE_LOAD_TIMEOUT,
  IMAGE_MAX_DIMENSION,
  IMAGE_COMPRESSION_SIZE,
  IMAGE_COMPRESSION_QUALITY,
  MAX_COMPRESSED_IMAGE_SIZE_BYTES,
} from '@/lib/constants'

/**
 * Compress and resize image to reduce storage size
 * Converts to JPEG at configured quality, max size from constants
 */
export async function compressImage(file: File): Promise<string> {
  // Validate file type first
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Please use JPEG, PNG, GIF, or WebP.`)
  }

  // Check file size (max from constants before compression)
  if (file.size > MAX_UNCOMPRESSED_IMAGE_SIZE_BYTES) {
    throw new Error(`Image is too large. Please use an image smaller than ${MAX_UNCOMPRESSED_IMAGE_SIZE_MB}MB.`)
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('Failed to read the image file. Please try again.'))

    reader.onload = (e) => {
      const img = new Image()
      let loadTimeout: NodeJS.Timeout

      // Set timeout for image loading
      loadTimeout = setTimeout(() => {
        reject(new Error('Image loading timed out. The file may be corrupted or too large.'))
      }, IMAGE_LOAD_TIMEOUT)

      img.onerror = () => {
        clearTimeout(loadTimeout)
        reject(new Error('Failed to load image. The file may be corrupted or in an unsupported format.'))
      }

      img.onload = () => {
        clearTimeout(loadTimeout)

        try {
          // Validate image dimensions
          if (img.width > IMAGE_MAX_DIMENSION || img.height > IMAGE_MAX_DIMENSION) {
            reject(new Error(`Image dimensions too large (${img.width}x${img.height}). Maximum ${IMAGE_MAX_DIMENSION}x${IMAGE_MAX_DIMENSION} pixels.`))
            return
          }

          if (img.width === 0 || img.height === 0) {
            reject(new Error('Invalid image dimensions. The image may be corrupted.'))
            return
          }

          // Calculate new dimensions (preserve aspect ratio)
          const MAX_SIZE = IMAGE_COMPRESSION_SIZE
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_SIZE) {
              height = (height * MAX_SIZE) / width
              width = MAX_SIZE
            }
          } else {
            if (height > MAX_SIZE) {
              width = (width * MAX_SIZE) / height
              height = MAX_SIZE
            }
          }

          // Create canvas and draw resized image
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(width)
          canvas.height = Math.round(height)

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Unable to process image. Your browser may not support this feature.'))
            return
          }

          // Fill with white background first (prevents black images)
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, Math.round(width), Math.round(height))

          // Use better image smoothing
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'

          ctx.drawImage(img, 0, 0, Math.round(width), Math.round(height))

          // Convert to JPEG at configured quality
          try {
            const compressedBase64 = canvas.toDataURL('image/jpeg', IMAGE_COMPRESSION_QUALITY)

            // DEBUG: Check if image is actually black
            console.log('🖼️ Compressed image size:', compressedBase64.length)
            console.log('🖼️ First 100 chars:', compressedBase64.substring(0, 100))

            // Validate output size (should be under limit for localStorage)
            if (compressedBase64.length > MAX_COMPRESSED_IMAGE_SIZE_BYTES) {
              reject(new Error('Compressed image is still too large. Please use a smaller image.'))
              return
            }

            resolve(compressedBase64)
          } catch (canvasError) {
            reject(new Error('Failed to compress image. Your browser may be low on memory.'))
          }
        } catch (error: any) {
          reject(new Error(`Image processing failed: ${error.message || 'Unknown error'}`))
        }
      }

      const result = e.target?.result
      if (typeof result === 'string') {
        img.src = result
      } else {
        reject(new Error('Failed to read image data.'))
      }
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Check if localStorage has enough space for new data
 * Returns remaining space in bytes (approximate)
 */
export function checkStorageSpace(): { available: number; total: number; used: number } {
  // Most browsers have 5-10MB limit
  const QUOTA = 10 * 1024 * 1024 // 10MB estimate

  let used = 0
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      used += localStorage[key].length + key.length
    }
  }

  return {
    total: QUOTA,
    used,
    available: QUOTA - used
  }
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

/**
 * Server-side image validation utilities
 * Validates image files for security and quality
 */

import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES, IMAGE_MAX_DIMENSION } from '@/lib/constants'

export interface ImageValidationResult {
  valid: boolean
  error?: string
  width?: number
  height?: number
  size?: number
  type?: string
}

/**
 * Validate image file on the server side
 * Checks for:
 * - File type (magic bytes, not just extension)
 * - File size
 * - Image dimensions
 * - Potential malicious content
 */
export async function validateImageServer(
  buffer: Buffer | ArrayBuffer
): Promise<ImageValidationResult> {
  try {
    const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)

    // Check file size
    if (bytes.length > MAX_IMAGE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File size ${(bytes.length / 1024 / 1024).toFixed(2)}MB exceeds limit of ${
          MAX_IMAGE_SIZE_BYTES / 1024 / 1024
        }MB`,
      }
    }

    // Detect file type from magic bytes (first few bytes of file)
    const fileType = detectImageType(bytes)
    if (!fileType) {
      return {
        valid: false,
        error: 'Invalid or unsupported image format',
      }
    }

    // Verify against allowed types
    if (!ALLOWED_IMAGE_TYPES.includes(fileType)) {
      return {
        valid: false,
        error: `File type ${fileType} not allowed. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      }
    }

    // Get image dimensions (basic check without full decode)
    const dimensions = getImageDimensions(bytes, fileType)
    if (dimensions) {
      if (dimensions.width > IMAGE_MAX_DIMENSION || dimensions.height > IMAGE_MAX_DIMENSION) {
        return {
          valid: false,
          error: `Image dimensions ${dimensions.width}x${dimensions.height} exceed maximum ${IMAGE_MAX_DIMENSION}x${IMAGE_MAX_DIMENSION}`,
        }
      }
    }

    return {
      valid: true,
      width: dimensions?.width,
      height: dimensions?.height,
      size: bytes.length,
      type: fileType,
    }
  } catch (error) {
    return {
      valid: false,
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Detect image type from magic bytes (file signature)
 * More secure than relying on file extension
 */
function detectImageType(bytes: Buffer): string | null {
  // Check magic bytes (file signatures)
  if (bytes.length < 12) return null

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }

  // GIF: 47 49 46 38 (GIF8)
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return 'image/gif'
  }

  // WebP: 52 49 46 46 ... 57 45 42 50 (RIFF...WEBP)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }

  return null
}

/**
 * Extract image dimensions from file headers
 * Fast dimension check without full image decode
 */
function getImageDimensions(
  bytes: Buffer,
  type: string
): { width: number; height: number } | null {
  try {
    if (type === 'image/png') {
      // PNG: Width and height are at bytes 16-23 (big-endian 32-bit integers)
      if (bytes.length < 24) return null
      const width = bytes.readUInt32BE(16)
      const height = bytes.readUInt32BE(20)
      return { width, height }
    }

    if (type === 'image/jpeg') {
      // JPEG: Parse SOF (Start of Frame) marker
      let offset = 2 // Skip initial FF D8
      while (offset < bytes.length - 9) {
        if (bytes[offset] !== 0xff) break
        const marker = bytes[offset + 1]

        // SOF markers (Start of Frame)
        if (
          marker === 0xc0 ||
          marker === 0xc1 ||
          marker === 0xc2 ||
          marker === 0xc3 ||
          marker === 0xc5 ||
          marker === 0xc6 ||
          marker === 0xc7 ||
          marker === 0xc9 ||
          marker === 0xca ||
          marker === 0xcb ||
          marker === 0xcd ||
          marker === 0xce ||
          marker === 0xcf
        ) {
          const height = bytes.readUInt16BE(offset + 5)
          const width = bytes.readUInt16BE(offset + 7)
          return { width, height }
        }

        // Skip to next marker
        const segmentLength = bytes.readUInt16BE(offset + 2)
        offset += 2 + segmentLength
      }
    }

    if (type === 'image/gif') {
      // GIF: Width and height at bytes 6-9 (little-endian 16-bit integers)
      if (bytes.length < 10) return null
      const width = bytes.readUInt16LE(6)
      const height = bytes.readUInt16LE(8)
      return { width, height }
    }

    if (type === 'image/webp') {
      // WebP: More complex, but basic VP8 dimensions at offset 26-29
      if (bytes.length < 30) return null
      // This is a simplified check - full WebP parsing is complex
      const width = bytes.readUInt16LE(26) & 0x3fff
      const height = bytes.readUInt16LE(28) & 0x3fff
      return { width, height }
    }
  } catch (error) {
    console.error('Error reading image dimensions:', error)
  }

  return null
}

/**
 * Validate image file on the client side
 * Works with File objects from browser file input
 */
export async function validateImageClient(file: File): Promise<ImageValidationResult> {
  try {
    // Check file size first (quick check)
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds limit of ${
          MAX_IMAGE_SIZE_BYTES / 1024 / 1024
        }MB`,
      }
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Use server validation logic on the buffer
    return await validateImageServer(buffer)
  } catch (error) {
    return {
      valid: false,
      error: `Client validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Validate base64 image string
 * Used for client-uploaded images
 */
export async function validateBase64Image(base64String: string): Promise<ImageValidationResult> {
  try {
    // Remove data URL prefix if present
    const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '')

    // Validate base64 format
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
      return {
        valid: false,
        error: 'Invalid base64 format',
      }
    }

    // Convert to buffer and validate
    const buffer = Buffer.from(base64Data, 'base64')
    return await validateImageServer(buffer)
  } catch (error) {
    return {
      valid: false,
      error: `Base64 validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  // Remove any path components
  const basename = filename.split('/').pop()?.split('\\').pop() || 'image'

  // Remove dangerous characters
  const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_')

  // Limit length
  const maxLength = 100
  if (sanitized.length > maxLength) {
    const ext = sanitized.split('.').pop()
    const name = sanitized.substring(0, maxLength - (ext ? ext.length + 1 : 0))
    return ext ? `${name}.${ext}` : name
  }

  return sanitized
}

import { NextRequest, NextResponse } from 'next/server'
import { validateBase64Image } from '@/lib/utils/imageValidation'

/**
 * POST /api/validate-image
 * Server-side image validation endpoint
 *
 * Body: { image: string } - base64 encoded image
 * Returns: { valid: boolean, error?: string, metadata?: object }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { image } = body

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'No image data provided' },
        { status: 400 }
      )
    }

    // Validate the image
    const result = await validateBase64Image(image)

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error },
        { status: 400 }
      )
    }

    // Return validation result with metadata
    return NextResponse.json({
      valid: true,
      metadata: {
        width: result.width,
        height: result.height,
        size: result.size,
        type: result.type,
      },
    })
  } catch (error) {
    console.error('Image validation error:', error)
    return NextResponse.json(
      { valid: false, error: 'Internal server error during validation' },
      { status: 500 }
    )
  }
}

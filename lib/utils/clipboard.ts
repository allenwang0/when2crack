/**
 * Copy text to clipboard with fallback support for older browsers
 */
export async function copyToClipboard(text: string): Promise<void> {
  // Try modern Clipboard API first
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback:', err)
      // Fall through to fallback methods
    }
  }

  // Fallback 1: Use execCommand (deprecated but widely supported)
  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)

    if (successful) {
      return
    }
  } catch (err) {
    console.warn('execCommand fallback failed:', err)
  }

  // If all methods fail, throw an error
  throw new Error('Failed to copy to clipboard')
}

/**
 * Check if clipboard API is available
 */
export function isClipboardAvailable(): boolean {
  return !!(navigator.clipboard && window.isSecureContext)
}

/**
 * Get a user-friendly error message based on the error type
 */
export function getClipboardErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'Clipboard access denied. Please allow clipboard permissions.'
    }
    if (error.name === 'SecurityError') {
      return 'Clipboard access not allowed on this page. Try using HTTPS.'
    }
  }

  // Check if it's an HTTPS issue
  if (typeof window !== 'undefined' && window.location.protocol === 'http:') {
    return 'Clipboard requires a secure connection (HTTPS).'
  }

  return 'Failed to copy link. Please try again.'
}

// ZeroTrace — Client-side constants
// ZERO SECRETS. No API keys, no backend endpoints, no telemetry.

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB per file
export const MAX_FILES = 50 // circuit breaker: max files per drop

export const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]

export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf']

export const FILE_TYPE_LABELS = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'application/pdf': 'PDF',
}

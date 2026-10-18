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

// ------------------------------------------------------------
// Threat Score Weights (0–100 scale)
// Derived from exifr tag keys and pdf-lib info dictionary fields.
// ------------------------------------------------------------
export const THREAT_WEIGHTS = {
  GPS_COORDINATES: 50, // Latitude/Longitude — Immediate Critical Risk
  DEVICE_IDENTITY: 30, // Serial / Owner / Unique ID
  TIMESTAMPS: 15, // Modification / Creation dates
  CAMERA_SPECS: 15, // Make / Model / Software / OS build
}

// ------------------------------------------------------------
// Risk Tiers (score ranges -> tier)
// ------------------------------------------------------------
export const RISK_TIERS = [
  { label: 'CRITICAL', min: 70, badge: 'bg-rose-900/40 text-rose-500 border-rose-500/30' },
  { label: 'HIGH', min: 40, badge: 'bg-amber-900/40 text-amber-500 border-amber-500/30' },
  { label: 'MEDIUM', min: 15, badge: 'bg-yellow-900/40 text-yellow-500 border-yellow-500/30' },
  { label: 'CLEAN / LOW', min: 0, badge: 'bg-emerald-900/40 text-emerald-500 border-emerald-500/30' },
]

export function getRiskTier(score) {
  for (const tier of RISK_TIERS) {
    if (score >= tier.min) return tier
  }
  return RISK_TIERS[RISK_TIERS.length - 1]
}

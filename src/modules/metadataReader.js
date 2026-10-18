// ZeroTrace — Metadata reader (T-005)
// Parses images with exifr and PDFs with pdf-lib.
// Computes SHA-256 fingerprint and a numerical Threat Score (0–100).
// All binary parsing is wrapped in try/catch; corrupt/invalid files yield
// a safe error object instead of throwing. No network access.

import { parse as parseExif } from 'exifr'
import { PDFDocument } from 'pdf-lib'
import {
  THREAT_WEIGHTS,
  getRiskTier,
} from '../utils/constants.js'

// Hex-encode a Uint8Array.
function toHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Compute SHA-256 digest of an ArrayBuffer via the native Web Crypto API.
 * @param {ArrayBuffer} buffer
 * @returns {Promise<string>} lowercase hex string
 */
export async function sha256(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return toHex(new Uint8Array(digest))
}

// Normalized shape returned for every file.
export function emptyResult({ name, type, size }) {
  return {
    file: { name, type, size },
    kind: null,
    exif: null,
    gps: null,
    pdfInfo: null,
    hash: null,
    threatScore: 0,
    riskTier: getRiskTier(0),
    osmUrl: null,
    strippedTags: [],
    error: null,
  }
}

/**
 * Read metadata from a file buffer.
 * @param {{name:string, type:string, size:number, buffer:ArrayBuffer}} input
 */
export async function readMetadata(input) {
  const { name, type, size, buffer } = input
  const result = emptyResult({ name, type, size })

  try {
    // SHA-256 fingerprint of the original buffer.
    result.hash = await sha256(buffer)

    if (type === 'application/pdf') {
      result.kind = 'pdf'
      result.pdfInfo = await readPdfMetadata(buffer)
      computeThreatScorePdf(result, result.pdfInfo)
    } else if (/^image\/(jpeg|png|webp)$/.test(type)) {
      result.kind = 'image'
      result.exif = await readImageMetadata(buffer)
      if (
        result.exif &&
        (result.exif.latitude != null || result.exif.longitude != null)
      ) {
        result.gps = {
          latitude: result.exif.latitude,
          longitude: result.exif.longitude,
          osmUrl: `https://www.openstreetmap.org/?mlat=${result.exif.latitude}&mlon=${result.exif.longitude}&zoom=15`,
        }
        result.strippedTags.push('GPS Coordinates')
      }
      computeThreatScoreImage(result, result.exif)
    } else {
      result.error = `Unsupported file type: ${type}`
    }
  } catch (err) {
    result.error = err.message || 'Failed to read metadata'
  }

  result.riskTier = getRiskTier(result.threatScore)
  return result
}

/**
 * Compute threat score for image EXIF data.
 */
function computeThreatScoreImage(result, exif) {
  let score = 0

  if (!exif) {
    result.threatScore = score
    return
  }

  // GPS Coordinates — +50
  if (exif.latitude != null && exif.longitude != null) {
    score += THREAT_WEIGHTS.GPS_COORDINATES
  }

  // Device identity — SerialNumber +30
  if (exif.serialNumber) {
    score += THREAT_WEIGHTS.DEVICE_IDENTITY
    result.strippedTags.push('Device Serial / Unique ID')
  }

  // Timestamps — +15
  if (
    exif.dateTimeOriginal ||
    exif.dateTimeDigitized ||
    exif.modifyDate
  ) {
    score += THREAT_WEIGHTS.TIMESTAMPS
    result.strippedTags.push('Timestamps')
  }

  // Camera specs / Software / OS build — +15
  if (exif.make || exif.model || exif.software || exif.orientation) {
    score += THREAT_WEIGHTS.CAMERA_SPECS
    result.strippedTags.push('Camera / Software specs')
  }

  result.threatScore = Math.min(score, 100)
}

/**
 * Compute threat score for PDF info dictionary.
 */
function computeThreatScorePdf(result, info) {
  let score = 0

  if (!info) {
    result.threatScore = score
    return
  }

  // Device identity — Creator / Producer +30
  if (info.creator || info.producer) {
    score += THREAT_WEIGHTS.DEVICE_IDENTITY
    result.strippedTags.push('Creator / Producer')
  }

  // Timestamps — creationDate / modificationDate +15
  if (info.creationDate || info.modificationDate) {
    score += THREAT_WEIGHTS.TIMESTAMPS
    result.strippedTags.push('Timestamps')
  }

  result.threatScore = Math.min(score, 100)
}

/**
 * Parse image EXIF/GPS/XMP via exifr. Accepts an ArrayBuffer.
 */
async function readImageMetadata(buffer) {
  const data = await parseExif(buffer)
  if (!data) return null

  return {
    make: data.Make || null,
    model: data.Model || null,
    software: data.Software || null,
    serialNumber: data.SerialNumber || null,
    dateTimeOriginal: data.DateTimeOriginal || null,
    dateTimeDigitized: data.DateTimeDigitized || null,
    modifyDate: data.ModifyDate || null,
    orientation: data.Orientation || null,
    width: data.ExifImageWidth != null ? data.ExifImageWidth : data.ImageWidth,
    height:
      data.ExifImageHeight != null
        ? data.ExifImageHeight
        : data.ImageHeight,
    iso: data.ISO != null ? data.ISO : null,
    aperture: data.FNumber != null ? `f/${data.FNumber}` : null,
    shutterSpeed:
      data.ExposureTime != null ? `${data.ExposureTime}s` : null,
    focalLength: data.FocalLength != null ? `${data.FocalLength}mm` : null,
    latitude: data.GPSLatitude != null ? data.GPSLatitude : null,
    longitude: data.GPSLongitude != null ? data.GPSLongitude : null,
  }
}

/**
 * Parse PDF document info dictionary via pdf-lib.
 */
async function readPdfMetadata(buffer) {
  const pdfDoc = await PDFDocument.load(buffer)
  const creationDate = pdfDoc.getCreationDate()
  const modificationDate = pdfDoc.getModificationDate()

  return {
    title: pdfDoc.getTitle() || null,
    author: pdfDoc.getAuthor() || null,
    subject: pdfDoc.getSubject() || null,
    keywords: pdfDoc.getKeywords() || null,
    creator: pdfDoc.getCreator() || null,
    producer: pdfDoc.getProducer() || null,
    creationDate: creationDate ? creationDate.toISOString() : null,
    modificationDate: modificationDate ? modificationDate.toISOString() : null,
    pageCount: pdfDoc.getPageCount(),
  }
}

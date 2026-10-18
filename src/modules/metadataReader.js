// ZeroTrace — Metadata reader (T-005)
// Parses images with exifr and PDFs with pdf-lib.
// All binary parsing is wrapped in try/catch; corrupt/invalid files yield
// a safe error object instead of throwing. No network access.

import { parse as parseExif } from 'exifr'
import { PDFDocument } from 'pdf-lib'

// Normalized shape returned for every file.
export function emptyResult({ name, type, size }) {
  return {
    file: { name, type, size },
    kind: null,
    exif: null,
    gps: null,
    pdfInfo: null,
    riskLevel: 'safe',
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
    if (type === 'application/pdf') {
      result.kind = 'pdf'
      result.pdfInfo = await readPdfMetadata(buffer)
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
        }
        result.riskLevel = 'warning' // GPS data found = high risk (rose-500)
      }
    } else {
      result.error = `Unsupported file type: ${type}`
    }
  } catch (err) {
    result.error = err.message || 'Failed to read metadata'
  }

  return result
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

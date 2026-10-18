// ZeroTrace — Stripper core (T-007)
// Lossless JPEG APP chunk stripping (EXIF lives in APP1) + PDF info-dictionary
// sanitization via pdf-lib. Returns an ArrayBuffer of the sanitized file.
// Throws on invalid/corrupt input; callers wrap in try/catch (see RULES.md).
//
// T-008 adds the PNG/WebP OffscreenCanvas fallback.

import { PDFDocument } from 'pdf-lib'

/**
 * Dispatch sanitization by file type.
 * @param {{name:string, type:string, size:number, buffer:ArrayBuffer}} input
 */
export async function stripFile(input) {
  const { name, type, buffer } = input

  if (type === 'application/pdf') {
    return { name, type, buffer: await stripPdf(buffer) }
  }

  if (type === 'image/jpeg') {
    return { name, type, buffer: stripJpeg(buffer) }
  }

  if (type === 'image/png' || type === 'image/webp') {
    return {
      name,
      type: 'image/png', // canvas re-encode normalizes to PNG
      buffer: await stripPngWebpCanvas(buffer, type),
    }
  }

  throw new Error(`Sanitization not implemented for type: ${type} (${name})`)
}

/**
 * PNG/WebP fallback: redraw pixels onto an OffscreenCanvas and re-export.
 * Because only raw pixels are carried over, all container metadata is lost.
 */
async function stripPngWebpCanvas(buffer, mimeType) {
  const blob = new Blob([buffer], { type: mimeType })
  const bitmap = await createImageBitmap(blob)
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0)
  const outBlob = await canvas.convertToBlob({ type: 'image/png' })
  return outBlob.arrayBuffer()
}

/**
 * Strip all APPn (0xE0–0xEF) and COM (0xFE) segments from a JPEG.
 * EXIF/XMP metadata lives in APP1 (0xFFE1); removing every APP segment is
 * lossless for image data because SOF/DHT/DQT/SOS/entropy/EOI are preserved.
 */
export function stripJpeg(buffer) {
  const data = new Uint8Array(buffer)
  const n = data.length

  if (n < 2 || data[0] !== 0xff || data[1] !== 0xd8) {
    throw new Error('Not a valid JPEG (missing SOI marker)')
  }

  const out = []
  let i = 0

  while (i < n) {
    // Every 0xFF outside entropy data begins a marker.
    if (data[i] !== 0xff) {
      i++
      continue
    }

    const marker = data[i + 1]

    // SOI — keep
    if (marker === 0xd8) {
      out.push(0xff, 0xd8)
      i += 2
      continue
    }

    // EOI — keep and stop
    if (marker === 0xd9) {
      out.push(0xff, 0xd9)
      i += 2
      break
    }

    // SOS — entropy data follows verbatim (may contain stuffed 0xFF bytes);
    // copy the rest through EOI and finish.
    if (marker === 0xda) {
      for (; i < n; i++) {
        out.push(data[i])
      }
      break
    }

    // 0xFF 0x00 / 0xFF 0xFF are stuffed bytes outside entropy; keep one 0xFF.
    if (marker === 0x00 || marker === 0xff) {
      out.push(0xff)
      i += 2
      continue
    }

    // All remaining markers (APPn, COM, DQT, DHT, SOF, DRI, …) have a
    // two-byte length that includes itself.
    if (i + 2 >= n) {
      break
    }
    const segmentLen = (data[i + 2] << 8) | data[i + 3]
    const segmentEnd = i + 2 + segmentLen

    const isApp = marker >= 0xe0 && marker <= 0xef
    const isCom = marker === 0xfe

    if (isApp || isCom) {
      // Strip this metadata segment entirely.
      i = segmentEnd
      continue
    }

    // Keep the segment verbatim.
    const end = Math.min(segmentEnd, n)
    for (let j = i; j < end; j++) {
      out.push(data[j])
    }
    i = segmentEnd
  }

  return new Uint8Array(out).buffer
}

/**
 * Clear the PDF document info dictionary via pdf-lib.
 */
async function stripPdf(buffer) {
  const pdfDoc = await PDFDocument.load(buffer)

  pdfDoc.setTitle('')
  pdfDoc.setAuthor('')
  pdfDoc.setSubject('')
  pdfDoc.setKeywords([])
  pdfDoc.setCreator('')
  pdfDoc.setProducer('')

  const sanitized = await pdfDoc.save()
  return sanitized.buffer
}

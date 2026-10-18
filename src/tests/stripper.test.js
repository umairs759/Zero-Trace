import { describe, it, expect } from 'vitest'
import { stripFile, stripJpeg } from '../modules/stripper.js'

/**
 * Build a minimal JPEG: SOI + APP1(EXIF) + SOF0 + EOI.
 * The APP1 segment carries a fake EXIF payload that stripJpeg must remove.
 */
function makeJpegWithExif() {
  const segments = [0xff, 0xd8] // SOI

  // APP1 segment payload (fake EXIF header)
  const exifPayload = [
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, // TIFF header, IFD0 @ 8
    0x01, 0x00, // 1 IFD entry
    0x1e, 0x01, 0x02, 0x00, 0x04, 0x00, 0x00, 0x00, // Make tag, 4 ASCII
    0x4d, 0x6f, 0x63, 0x00, // "Moc\0"
    0x00, 0x00, 0x00, 0x00, // next IFD offset = 0
  ]

  const len = exifPayload.length
  segments.push(
    0xff,
    0xe1,
    (len >> 8) & 0xff,
    len & 0xff,
    ...exifPayload
  )

  // SOF0 baseline DCT (image data marker that must be preserved)
  segments.push(
    0xff, 0xc0, 0x00, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x11, 0x00
  )

  segments.push(0xff, 0xd9) // EOI
  return new Uint8Array(segments).buffer
}

function hasMarker(view, marker) {
  for (let i = 0; i < view.length - 1; i++) {
    if (view[i] === 0xff && view[i + 1] === marker) return true
  }
  return false
}

describe('stripper', () => {
  it('strips the APP1 EXIF segment from a JPEG while preserving image markers', () => {
    const buffer = makeJpegWithExif()
    const view = new Uint8Array(buffer)
    expect(hasMarker(view, 0xe1)).toBe(true) // EXIF present before stripping

    const stripped = stripJpeg(buffer)
    const sv = new Uint8Array(stripped)
    expect(hasMarker(sv, 0xe1)).toBe(false) // EXIF removed

    // Structural markers preserved
    expect(sv[0]).toBe(0xff)
    expect(sv[1]).toBe(0xd8) // SOI
    expect(sv[sv.length - 2]).toBe(0xff)
    expect(sv[sv.length - 1]).toBe(0xd9) // EOI
    expect(hasMarker(sv, 0xc0)).toBe(true) // SOF0 preserved
  })

  it('rejects input without a valid JPEG SOI marker', () => {
    expect(() => stripJpeg(new ArrayBuffer(8))).toThrow()
  })

  it('stripFile routes a JPEG through stripJpeg and removes EXIF', async () => {
    const { buffer } = await stripFile({
      name: 'a.jpg',
      type: 'image/jpeg',
      size: 0,
      buffer: makeJpegWithExif(),
    })
    expect(hasMarker(new Uint8Array(buffer), 0xe1)).toBe(false)
  })

  it('clears the PDF document info dictionary', async () => {
    const { PDFDocument } = await import('pdf-lib')

    const doc = await PDFDocument.create()
    doc.setTitle('Secret Title')
    doc.setAuthor('Secret Author')
    const original = (await doc.save()).buffer

    const { buffer } = await stripFile({
      name: 'a.pdf',
      type: 'application/pdf',
      size: original.byteLength,
      buffer: original,
    })

    const cleaned = await PDFDocument.load(buffer)
    expect(cleaned.getTitle()).toBe('')
    expect(cleaned.getAuthor()).toBe('')
  })
})

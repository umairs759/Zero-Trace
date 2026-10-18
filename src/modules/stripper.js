import { PDFDocument } from 'pdf-lib'

/**
 * Dispatch sanitization by file type.
 * @param {{name:string, type:string, size:number, buffer:ArrayBuffer}} input
 */
export async function stripFile(input) {
  const { name, type, buffer } = input

  if (!buffer) {
    throw new Error(`Buffer missing for file: ${name}`)
  }

  if (type === 'application/pdf') {
    return { name, type, buffer: await stripPdf(buffer) }
  }

  if (type === 'image/jpeg') {
    return { name, type, buffer: stripJpeg(buffer) }
  }

  if (type === 'image/png' || type === 'image/webp') {
    return {
      name,
      type: 'image/png',
      buffer: await stripPngWebpCanvas(buffer, type),
    }
  }

  throw new Error(`Sanitization not implemented for type: ${type} (${name})`)
}

/**
 * PNG/WebP canvas fallback using standard browser Image & Canvas
 * Strips all metadata completely by redrawing pure pixels.
 */
async function stripPngWebpCanvas(buffer, mimeType = 'image/png') {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const img = new Image()

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)

        canvas.toBlob((cleanBlob) => {
          if (!cleanBlob) {
            reject(new Error('Canvas export failed'))
            return
          }
          cleanBlob.arrayBuffer().then(resolve).catch(reject)
        }, 'image/png')
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image for canvas stripping'))
    }

    img.src = url
  })
}

/**
 * Strip all APPn (0xE0–0xEF) and COM (0xFE) segments from a JPEG.
 * Lossless for image data because SOF/DHT/DQT/SOS/entropy/EOI are preserved.
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

    // SOS — copy remaining entropy data through EOI
    if (marker === 0xda) {
      for (; i < n; i++) {
        out.push(data[i])
      }
      break
    }

    // 0xFF 0x00 / 0xFF 0xFF
    if (marker === 0x00 || marker === 0xff) {
      out.push(0xff)
      i += 2
      continue
    }

    if (i + 2 >= n) {
      break
    }
    const segmentLen = (data[i + 2] << 8) | data[i + 3]
    const segmentEnd = i + 2 + segmentLen

    const isApp = marker >= 0xe0 && marker <= 0xef
    const isCom = marker === 0xfe

    if (isApp || isCom) {
      i = segmentEnd
      continue
    }

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

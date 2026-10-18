import { PDFDocument } from 'pdf-lib'

export function generateCleanName(originalName, index = 1) {
  if (!originalName) return `ZeroTrace_Clean_${index}`
  const lastDot = originalName.lastIndexOf('.')
  if (lastDot === -1) return `${originalName}_clean`
  const base = originalName.substring(0, lastDot)
  const ext = originalName.substring(lastDot)
  return `${base}_clean${ext}`
}

export async function stripFile(input) {
  const { name, buffer } = input
  let type = (input.type || '').toLowerCase()

  if (!buffer) {
    throw new Error(`Buffer missing for file: ${name}`)
  }

  const ext = (name.split('.').pop() || '').toLowerCase()
  if (!type || type === 'application/octet-stream') {
    if (['jpg', 'jpeg'].includes(ext)) type = 'image/jpeg'
    else if (ext === 'png') type = 'image/png'
    else if (ext === 'webp') type = 'image/webp'
    else if (ext === 'pdf') type = 'application/pdf'
  }

  if (type === 'application/pdf' || ext === 'pdf') {
    const cleanBuf = await stripPdf(buffer)
    return { name, type: 'application/pdf', buffer: cleanBuf }
  }

  if (type === 'image/jpeg' || ['jpg', 'jpeg'].includes(ext)) {
    const cleanBuf = stripJpeg(buffer)
    return { name, type: 'image/jpeg', buffer: cleanBuf }
  }

  if (type === 'image/png' || type === 'image/webp' || ['png', 'webp'].includes(ext)) {
    const cleanBuf = await stripCanvasFallback(buffer, type || 'image/png')
    return { name, type: 'image/png', buffer: cleanBuf }
  }

  try {
    const cleanBuf = await stripCanvasFallback(buffer, 'image/png')
    return { name, type: 'image/png', buffer: cleanBuf }
  } catch (e) {
    throw new Error(`Unsupported file type: ${type || ext} (${name})`)
  }
}

function stripCanvasFallback(buffer, mimeType) {
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
            reject(new Error('Canvas conversion failed'))
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
      reject(new Error('Image failed to decode'))
    }

    img.src = url
  })
}

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

    if (marker === 0xd8) {
      out.push(0xff, 0xd8)
      i += 2
      continue
    }

    if (marker === 0xd9) {
      out.push(0xff, 0xd9)
      i += 2
      break
    }

    if (marker === 0xda) {
      for (; i < n; i++) {
        out.push(data[i])
      }
      break
    }

    if (marker === 0x00 || marker === 0xff) {
      out.push(0xff)
      i += 2
      continue
    }

    if (i + 2 >= n) break
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

// ZeroTrace — Batch ZIP exporter (T-009)
// Generates a ZIP of sanitized files via jszip and triggers a browser download.
// The download blob URL is revoked after the download starts to free memory.
// No network access; 100% client-side.

import JSZip from 'jszip'

/**
 * Download a batch of sanitized files as a single ZIP archive.
 * @param {Array<{name:string, type:string, buffer:ArrayBuffer}>} files
 * @param {string} zipName
 */
export async function exportZip(files, zipName = 'zero_trace_sanitized.zip') {
  if (!files || files.length === 0) {
    throw new Error('No files to export')
  }

  const zip = new JSZip()
  for (const file of files) {
    zip.file(file.name, file.buffer)
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  downloadBlob(blob, zipName)
}

/**
 * Trigger a download for a single Blob and revoke its Object URL.
 */
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.style.display = 'none'

  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  // Revoke after a brief delay so the browser can initiate the download.
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 200)
}

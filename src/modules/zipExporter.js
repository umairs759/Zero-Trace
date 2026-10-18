// ZeroTrace — Enterprise Batch ZIP exporter (T-009)
// Bundles sanitized files alongside a compliance audit report
// (sanitization_report.json) and triggers a browser download.
// The download blob URL is revoked after 200ms to free memory.
// No network access; 100% client-side.

import JSZip from 'jszip'
import { generateCleanName } from './stripper.js'
import { sha256 } from './metadataReader.js'

/**
 * Download a batch of sanitized files as a single ZIP archive,
 * including a compliance audit report manifest.
 * @param {Array<{name:string, type:string, buffer:ArrayBuffer, hash:string, threatScore:number, strippedTags:string[]}>} files
 * @param {string} zipName
 */
export async function exportZip(files, zipName = 'zero_trace_sanitized.zip') {
  if (!files || files.length === 0) {
    throw new Error('No files to export')
  }

  const zip = new JSZip()
  const reportFiles = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const sanitizedName = generateCleanName(file.name, i, file.type)
    const sanitizedHash = await sha256(file.buffer)

    zip.file(sanitizedName, file.buffer)

    reportFiles.push({
      originalName: file.name,
      sanitizedName,
      originalSha256: file.hash || null,
      sanitizedSha256: sanitizedHash,
      detectedThreatScore: file.threatScore || 0,
      strippedTags: file.strippedTags || [],
      status: 'SANITIZED',
    })
  }

  // Build compliance audit report.
  const report = {
    auditTimestamp: new Date().toISOString(),
    totalFilesProcessed: reportFiles.length,
    files: reportFiles,
  }

  zip.file('sanitization_report.json', JSON.stringify(report, null, 2))

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

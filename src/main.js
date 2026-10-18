import './style.css'
import { Dropzone, showToast } from './modules/dropzone.js'
import { renderResults, updateCardToClean } from './modules/uiRenderer.js'
import { stripFile } from './modules/stripper.js'
import { exportZip } from './modules/zipExporter.js'

const resultsEl = document.querySelector('#results')
const actionBarEl = document.querySelector('#action-bar-container') || document.querySelector('#action-bar')
const cleanBtn = document.querySelector('#clean-btn') || document.querySelector('button[data-action="clean"]')
const zipBtn = document.querySelector('#zip-btn') || document.querySelector('button[data-action="zip"]')
const resetBtn = document.querySelector('#reset-btn') || document.querySelector('button[data-action="reset"]')
const stagedCountEl = document.querySelector('#staged-count')

let parsed = []
let sanitized = []

export async function computeHash(buffer) {
  if (!buffer) return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  const raw = buffer instanceof ArrayBuffer ? buffer : (buffer.buffer || buffer)
  const digest = await crypto.subtle.digest('SHA-256', raw)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function updateActionBar() {
  const hasFiles = parsed.length > 0
  const hasSanitized = sanitized.length > 0

  if (actionBarEl) {
    actionBarEl.classList.toggle('hidden', !hasFiles)
  }

  if (stagedCountEl) {
    stagedCountEl.textContent = `${parsed.length} file(s) staged for sanitization`
  }

  if (cleanBtn) {
    cleanBtn.disabled = !hasFiles
    cleanBtn.textContent = `Sanitize ${parsed.length || 1} File${parsed.length > 1 ? 's' : ''}`
  }

  if (zipBtn) {
    zipBtn.disabled = !hasSanitized
    if (hasSanitized) {
      zipBtn.classList.remove('opacity-40', 'cursor-not-allowed')
      zipBtn.classList.add('bg-cyan-400', 'hover:bg-cyan-300', 'text-zinc-950')
    } else {
      zipBtn.classList.add('opacity-40', 'cursor-not-allowed')
      zipBtn.classList.remove('bg-cyan-400', 'hover:bg-cyan-300', 'text-zinc-950')
    }
  }
}

// Ingestion
const dropzoneEl = document.querySelector('#dropzone')
if (dropzoneEl) {
  new Dropzone({
    element: dropzoneEl,
    onFilesReady: async (files) => {
      parsed = []
      sanitized = []
      const { readMetadata } = await import('./modules/metadataReader.js')
      for (const file of files) {
        try {
          const meta = await readMetadata(file)
          const sha = await computeHash(file.buffer)
          parsed.push({
            ...file,
            ...meta,
            buffer: file.buffer,
            sha256: sha,
            isSanitized: false
          })
        } catch (e) {
          parsed.push({ ...file, isSanitized: false, sha256: await computeHash(file.buffer) })
        }
      }
      renderResults(resultsEl, parsed, handleCleanSingle)
      updateActionBar()
    },
    onError: (msg) => showToast(msg, 'error')
  })
}

// Clean Single File
export async function handleCleanSingle(index) {
  const file = parsed[index]
  if (!file) return

  try {
    const res = await stripFile(file)
    const cleanBuf = res.buffer || res
    const cleanSha = await computeHash(cleanBuf)

    file.sanitizedBuffer = cleanBuf
    file.sanitizedSha256 = cleanSha
    file.isSanitized = true

    const idx = sanitized.findIndex(s => s.name === file.name)
    if (idx >= 0) {
      sanitized[idx] = { name: file.name, type: file.type, buffer: cleanBuf, sha256: cleanSha }
    } else {
      sanitized.push({ name: file.name, type: file.type, buffer: cleanBuf, sha256: cleanSha })
    }

    // Direct card DOM update
    updateCardToClean(index, cleanSha, cleanBuf, file)
    updateActionBar()
    showToast(`Sanitized ${file.name} successfully`, 'success')
  } catch (err) {
    console.error(err)
    showToast(`Failed to clean file: ${err.message}`, 'error')
  }
}

// Clean All Files
if (cleanBtn) {
  cleanBtn.addEventListener('click', async () => {
    for (let i = 0; i < parsed.length; i++) {
      if (!parsed[i].isSanitized) {
        await handleCleanSingle(i)
      }
    }
  })
}

// Download ZIP
if (zipBtn) {
  zipBtn.addEventListener('click', () => {
    if (sanitized.length > 0) {
      exportZip(sanitized)
    }
  })
}

// Reset
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    parsed = []
    sanitized = []
    if (resultsEl) resultsEl.replaceChildren()
    updateActionBar()
    showToast('Memory buffers cleared', 'success')
  })
}

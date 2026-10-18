// ZeroTrace — Dropzone & ingestion module (T-004)
// Drag & drop events, file validation, ArrayBuffer extraction.
// 100% client-side; no network access.

import {
  MAX_FILE_SIZE,
  ALLOWED_TYPES,
  MAX_FILES,
  FILE_TYPE_LABELS,
} from '../utils/constants.js'

/**
 * Toast notification helper (minimal, dependency-free).
 */
export function showToast(message, type = 'error') {
  const existing = document.querySelector('.zerotrace-toast')
  if (existing) existing.remove()

  const toast = document.createElement('div')
  toast.className = `zerotrace-toast fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium border ${
    type === 'error'
      ? 'bg-rose-900/90 text-rose-100 border-rose-500'
      : 'bg-emerald-900/90 text-emerald-100 border-emerald-500'
  }`
  toast.textContent = message
  document.body.appendChild(toast)

  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transition = 'opacity 300ms ease'
    setTimeout(() => toast.remove(), 300)
  }, 4000)
}

/**
 * Dropzone class: handles drag-over/leave/drop, validates files, reads
 * them into ArrayBuffers and hands results back via callback.
 */
export class Dropzone {
  constructor({ element, onFilesReady, onError }) {
    this.element = element
    this.onFilesReady = onFilesReady
    this.onError = onError
    this.init()
  }

  init() {
    // Prevent default browser drag/drop navigation everywhere.
    const prevent = (e) => {
      e.preventDefault()
      e.stopPropagation()
    }
    ;['dragenter', 'dragover', 'dragleave', 'drop'].forEach((name) => {
      this.element.addEventListener(name, prevent, false)
      document.body.addEventListener(name, prevent, false)
    })

    // Visual feedback while dragging over the dropzone.
    ;['dragenter', 'dragover'].forEach((name) => {
      this.element.addEventListener(
        name,
        () => this.highlight(),
        false
      )
    })
    ;['dragleave', 'drop'].forEach((name) => {
      this.element.addEventListener(
        name,
        () => this.unhighlight(),
        false
      )
    })

    this.element.addEventListener('drop', (e) => this.handleDrop(e), false)
  }

  highlight() {
    this.element.classList.add(
      'border-emerald-500',
      'bg-slate-900/80',
      'text-slate-100'
    )
  }

  unhighlight() {
    this.element.classList.remove(
      'border-emerald-500',
      'bg-slate-900/80',
      'text-slate-100'
    )
  }

  async handleDrop(e) {
    const files = Array.from(e.dataTransfer.files)

    // Circuit breaker: too many files at once.
    if (files.length > MAX_FILES) {
      const msg = `Too many files (${files.length}). Maximum ${MAX_FILES} allowed per drop.`
      if (this.onError) this.onError(msg)
      else showToast(msg, 'error')
      return
    }

    const results = []
    for (const file of files) {
      const validation = this.validateFile(file)
      if (!validation.ok) {
        if (this.onError) this.onError(validation.message)
        else showToast(validation.message, 'error')
        continue
      }

      try {
        const buffer = await this.readArrayBuffer(file)
        results.push({
          name: file.name,
          type: file.type,
          size: file.size,
          label: FILE_TYPE_LABELS[file.type] || file.type,
          buffer,
          file,
        })
      } catch (err) {
        const msg = `Failed to read "${file.name}": ${err.message}`
        if (this.onError) this.onError(msg)
        else showToast(msg, 'error')
      }
    }

    if (results.length > 0 && this.onFilesReady) {
      this.onFilesReady(results)
    }
  }

  validateFile(file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        ok: false,
        message: `Unsupported file type: ${file.name} (${file.type || 'unknown'})`,
      }
    }
    if (file.size > MAX_FILE_SIZE) {
      return {
        ok: false,
        message: `File too large: ${file.name} (max 50MB)`,
      }
    }
    return { ok: true }
  }

  readArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsArrayBuffer(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = () =>
        reject(new Error(`Unable to read file: ${file.name}`))
      reader.onabort = () => reject(new Error(`Read aborted: ${file.name}`))
    })
  }
}

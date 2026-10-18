// ZeroTrace — Dropzone & ingestion module (T-004)
// Drag & drop, click-to-browse, Ctrl+V clipboard paste, file validation,
// ArrayBuffer extraction. 100% client-side; no network access.

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
 * Dropzone class: handles drag-over/leave/drop, click-to-browse,
 * Ctrl+V clipboard paste, validates files, reads them into ArrayBuffers
 * and hands results back via callback.
 */
export class Dropzone {
  constructor({ element, onFilesReady, onError }) {
    this.element = element
    this.onFilesReady = onFilesReady
    this.onError = onError
    this.fileInput = null
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
      this.element.addEventListener(name, () => this.highlight(), false)
    })
    ;['dragleave', 'drop'].forEach((name) => {
      this.element.addEventListener(name, () => this.unhighlight(), false)
    })

    this.element.addEventListener('drop', (e) => this.handleDrop(e), false)

    // Clicking the dropzone triggers the hidden file input.
    this.element.addEventListener('click', () => this.browse(), false)

    // Hidden file input for click-to-browse.
    this.fileInput = document.createElement('input')
    this.fileInput.type = 'file'
    this.fileInput.multiple = true
    this.fileInput.accept = ALLOWED_TYPES.join(',')
    this.fileInput.className = 'hidden'
    this.fileInput.setAttribute('aria-hidden', 'true')
    document.body.appendChild(this.fileInput)

    this.fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || [])
      this.processFiles(files)
      // Reset input so same file can be re-selected next time.
      this.fileInput.value = ''
    })

    // Global Ctrl+V clipboard paste handler.
    window.addEventListener('paste', (e) => this.handlePaste(e), false)
  }

  /** Programmatically open the native file picker. */
  browse() {
    if (this.fileInput) this.fileInput.click()
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
    this.processFiles(files)
  }

  async handlePaste(e) {
    const items = Array.from(e.clipboardData.items || [])
    const files = []
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }
    if (files.length > 0) this.processFiles(files)
  }

  async processFiles(files) {
    // Circuit breaker: too many files at once.
    if (files.length > MAX_FILES) {
      const msg = `Too many files (${files.length}). Maximum ${MAX_FILES} allowed per batch.`
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

        // Compute SHA-256 immediately using native Web Crypto API.
        const raw = buffer instanceof ArrayBuffer ? buffer : (buffer.buffer || buffer)
        const digest = await crypto.subtle.digest('SHA-256', raw)
        const sha256 = Array.from(new Uint8Array(digest))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')

        results.push({
          name: file.name,
          type: file.type,
          size: file.size,
          label: FILE_TYPE_LABELS[file.type] || file.type,
          buffer,
          file,
          sha256,
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

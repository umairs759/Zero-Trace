// ZeroTrace — Application entry point (T-003 to T-009)
// Renders the app shell using DOM nodes only (no innerHTML) and wires up
// dropzone ingestion → metadata reading → stripping → batch ZIP export.
// No network access; 100% client-side; telemetry-free.

import { Dropzone, showToast } from './modules/dropzone.js'
import { renderResults } from './modules/uiRenderer.js'
import { stripFile } from './modules/stripper.js'
import { exportZip } from './modules/zipExporter.js'

const app = document.querySelector('#app')

// ---------- Shell ----------
const header = document.createElement('header')
header.className =
  'bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between'
const brand = document.createElement('h1')
brand.className = 'text-xl font-bold text-emerald-400 tracking-tight'
brand.textContent = 'ZeroTrace'
const tagline = document.createElement('span')
tagline.className = 'text-xs text-slate-400 ml-2'
tagline.textContent = 'Metadata & EXIF Stripper'
header.appendChild(brand)
header.appendChild(tagline)

const dropzone = document.createElement('section')
dropzone.id = 'dropzone'
dropzone.className =
  'min-h-[300px] flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/50 px-8 py-12 text-slate-400 text-center transition-colors duration-200 hover:border-emerald-500 hover:bg-slate-900/80 hover:text-slate-100 cursor-pointer'
const dropHint = document.createElement('p')
dropHint.className = 'text-sm'
dropHint.textContent =
  'Drag & drop images (JPEG, PNG, WebP) or PDFs here — max 50MB per file'
dropzone.appendChild(dropHint)

const results = document.createElement('section')
results.id = 'results'
results.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-6 py-6'

const actionBar = document.createElement('section')
actionBar.id = 'action-bar'
actionBar.className =
  'bg-slate-900 border-t border-slate-800 px-6 py-4 flex items-center justify-between gap-4 hidden'

const cleanBtn = document.createElement('button')
cleanBtn.className =
  'px-4 py-2 rounded-lg text-sm font-semibold text-emerald-900 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
cleanBtn.textContent = 'Clean All'
cleanBtn.disabled = true

const zipBtn = document.createElement('button')
zipBtn.className =
  'px-4 py-2 rounded-lg text-sm font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
zipBtn.textContent = 'Download ZIP'
zipBtn.disabled = true

actionBar.appendChild(cleanBtn)
actionBar.appendChild(zipBtn)

app.appendChild(header)
app.appendChild(dropzone)
app.appendChild(results)
app.appendChild(actionBar)

// ---------- State ----------
let parsed = []
let sanitized = []

function updateActionBar() {
  const hasFiles = parsed.length > 0
  const hasSanitized = sanitized.length > 0
  cleanBtn.disabled = !hasFiles
  zipBtn.disabled = !hasSanitized
  actionBar.classList.toggle('hidden', !hasFiles)
}

// ---------- Ingestion ----------
new Dropzone({
  element: dropzone,
  onFilesReady: async (files) => {
    console.log('[ZeroTrace] Files ready for parsing:', files.length, 'file(s)')
    parsed = []
    sanitized = []
    const { readMetadata } = await import('./modules/metadataReader.js')
    for (const file of files) {
      parsed.push(await readMetadata(file))
    }
    renderResults(results, parsed)
    updateActionBar()
  },
  onError: (message) => {
    showToast(message, 'error')
  },
})

// ---------- Sanitize ----------
cleanBtn.addEventListener('click', async () => {
  sanitized = []
  let failed = 0
  for (const file of parsed) {
    try {
      sanitized.push(await stripFile(file))
    } catch (err) {
      failed++
      console.error(`[ZeroTrace] strip failed for ${file.name}:`, err)
    }
  }
  const ok = sanitized.length
  showToast(
    failed === 0
      ? `Sanitized ${ok}/${parsed.length} file(s)`
      : `Sanitized ${ok}/${parsed.length} file(s) (${failed} failed)`,
    failed === 0 ? 'success' : 'error'
  )
  updateActionBar()
})

// ---------- Export ----------
zipBtn.addEventListener('click', () => {
  exportZip(sanitized)
})

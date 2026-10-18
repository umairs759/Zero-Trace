import './style.css'
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
brand.textContent = 'ZeroTrace Enterprise'
const subBadge = document.createElement('span')
subBadge.className =
  'text-[10px] text-slate-500 font-mono uppercase tracking-wider bg-slate-800/50 px-2 py-0.5 rounded border border-slate-800 ml-2'
subBadge.textContent =
  '100% CLIENT-SIDE MEMORY • ZERO TELEMETRY • AIR-GAPPED READY'
header.appendChild(brand)
header.appendChild(subBadge)

const dropzone = document.createElement('section')
dropzone.id = 'dropzone'
dropzone.className =
  'min-h-[250px] flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/50 px-8 py-12 text-slate-400 text-center transition-colors duration-200 hover:border-emerald-500 hover:bg-slate-900/80 hover:text-slate-100 cursor-pointer m-6'
const dropHint = document.createElement('p')
dropHint.className = 'text-sm font-medium'
dropHint.textContent =
  'Drag & drop, click to browse, or paste (Ctrl+V) images (JPEG, PNG, WebP) or PDFs — max 50MB per file'
dropzone.appendChild(dropHint)

const results = document.createElement('section')
results.id = 'results'
results.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-6 py-4'

const actionBar = document.createElement('section')
actionBar.id = 'action-bar'
actionBar.className =
  'bg-slate-900 border-t border-slate-800 px-6 py-4 flex items-center justify-between gap-4 hidden fixed bottom-0 left-0 right-0 z-50'

const cleanBtn = document.createElement('button')
cleanBtn.className =
  'px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
cleanBtn.textContent = 'Clean All Files'
cleanBtn.disabled = true

const zipBtn = document.createElement('button')
zipBtn.className =
  'px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
zipBtn.textContent = 'Download Clean ZIP'
zipBtn.disabled = true

const resetBtn = document.createElement('button')
resetBtn.className =
  'px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-slate-700 hover:border-slate-500'
resetBtn.textContent = 'Clear / Reset'
resetBtn.disabled = true

actionBar.appendChild(cleanBtn)
actionBar.appendChild(zipBtn)
actionBar.appendChild(resetBtn)

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
  resetBtn.disabled = !hasFiles && !hasSanitized
  actionBar.classList.toggle('hidden', !hasFiles)
}

// ---------- Ingestion ----------
new Dropzone({
  element: dropzone,
  onFilesReady: async (files) => {
    parsed = []
    sanitized = []
    const { readMetadata } = await import('./modules/metadataReader.js')
    for (const file of files) {
      try {
        const meta = await readMetadata(file)
        // Preserve original ArrayBuffer so the stripper never receives undefined.
        parsed.push({ ...file, ...meta, buffer: file.buffer })
      } catch (e) {
        parsed.push(file)
      }
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
      const clean = await stripFile(file)
      sanitized.push(clean)
    } catch (err) {
      failed++
      console.error('[ZeroTrace] strip failed:', err)
    }
  }
  const ok = sanitized.length
  showToast(
    failed === 0
      ? `Sanitized ${ok}/${parsed.length} file(s) successfully`
      : `Sanitized ${ok}/${parsed.length} file(s) (${failed} failed)`,
    failed === 0 ? 'success' : 'error'
  )
  updateActionBar()
})

// ---------- Export ----------
zipBtn.addEventListener('click', () => {
  exportZip(sanitized)
})

// ---------- Reset ----------
resetBtn.addEventListener('click', () => {
  parsed = []
  sanitized = []
  renderResults(results, [])
  updateActionBar()
  showToast('Memory buffers cleared.', 'success')
})

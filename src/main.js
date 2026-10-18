import './style.css'
import { Dropzone, showToast } from './modules/dropzone.js'
import { renderResults } from './modules/uiRenderer.js'
import { stripFile, generateCleanName } from './modules/stripper.js'
import { exportZip } from './modules/zipExporter.js'

const app = document.querySelector('#app')

// ========================================================================
// SHELL BUILD (strictly document.createElement / .textContent — no innerHTML)
// ========================================================================

// ---------- Header ----------
const header = document.createElement('header')
header.className =
  'max-w-7xl mx-auto px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50'

const brand = document.createElement('div')
brand.className = 'flex items-center gap-2'

const brandIcon = document.createElement('span')
brandIcon.className = 'text-emerald-400 text-xl'
brandIcon.textContent = '🛡️'
brand.appendChild(brandIcon)

const brandTitle = document.createElement('span')
brandTitle.className = 'text-xl font-black text-slate-100 tracking-tight'
brandTitle.textContent = 'ZeroTrace Enterprise'
brand.appendChild(brandTitle)

const statusBadge = document.createElement('span')
statusBadge.className =
  'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
const statusDot = document.createElement('span')
statusDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse'
statusBadge.appendChild(statusDot)
const statusText = document.createElement('span')
statusText.textContent = '100% CLIENT-SIDE • ZERO TELEMETRY'
statusBadge.appendChild(statusText)

header.appendChild(brand)
header.appendChild(statusBadge)

// ---------- Hero & Dropzone ----------
const hero = document.createElement('section')
hero.className = 'max-w-7xl mx-auto px-6 py-8 text-center'

const heroTitle = document.createElement('h1')
heroTitle.className = 'text-3xl md:text-5xl font-black text-slate-100 tracking-tight mb-4'
heroTitle.textContent = 'Enterprise Metadata & EXIF Sanitizer'
hero.appendChild(heroTitle)

const heroSub = document.createElement('p')
heroSub.className = 'text-slate-400 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed'
heroSub.textContent =
  'Scrub hidden GPS coordinates, device serials, and tracking trails from images and PDFs in browser memory before publishing.'
hero.appendChild(heroSub)

const dropzone = document.createElement('section')
dropzone.id = 'dropzone'
dropzone.className =
  'border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-900/60 rounded-3xl p-8 md:p-12 text-center transition-all cursor-pointer shadow-2xl relative mb-10'

const dropIcon = document.createElement('span')
dropIcon.className = 'text-4xl mb-3 block'
dropIcon.textContent = '📁'
dropzone.appendChild(dropIcon)

const dropHeading = document.createElement('h2')
dropHeading.className = 'text-lg font-semibold text-slate-100 mb-2'
dropHeading.textContent = 'Drop files here, paste from clipboard, or browse'
dropzone.appendChild(dropHeading)

const browseBtn = document.createElement('button')
browseBtn.type = 'button'
browseBtn.className =
  'mt-4 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg transition-transform active:scale-95 inline-flex items-center gap-2'
const browseIcon = document.createElement('span')
browseIcon.textContent = '📂'
browseBtn.appendChild(browseIcon)
const browseLabel = document.createElement('span')
browseLabel.textContent = 'Browse Files'
browseBtn.appendChild(browseLabel)
dropzone.appendChild(browseBtn)

const dropChips = document.createElement('div')
dropChips.className = 'mt-6 flex flex-wrap justify-center gap-2'
const chips = [
  'JPEG (Lossless)',
  'PNG (Canvas Redraw)',
  'WebP',
  'PDF',
  'Max 50MB',
  'Clipboard (Ctrl+V) Ready',
]
for (const chipText of chips) {
  const chip = document.createElement('span')
  chip.className =
    'text-xs px-3 py-1.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700'
  chip.textContent = chipText
  dropChips.appendChild(chip)
}
dropzone.appendChild(dropChips)

hero.appendChild(dropzone)

// ---------- Results grid ----------
const results = document.createElement('section')
results.id = 'results'
results.className = 'max-w-7xl mx-auto px-6'
hero.appendChild(results)

// ---------- Action bar (sticky bottom) ----------
const actionBar = document.createElement('section')
actionBar.id = 'action-bar'
actionBar.className =
  'fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-3 z-50 hidden'

const cleanBtn = document.createElement('button')
cleanBtn.type = 'button'
cleanBtn.className =
  'px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg transition-transform active:scale-95'
cleanBtn.textContent = 'Clean All Files'
cleanBtn.disabled = true

const zipBtn = document.createElement('button')
zipBtn.type = 'button'
zipBtn.className =
  'px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed'
zipBtn.textContent = 'Download Clean ZIP'
zipBtn.disabled = true

const resetBtn = document.createElement('button')
resetBtn.type = 'button'
resetBtn.className =
  'px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-colors'
resetBtn.textContent = 'Clear / Reset'
resetBtn.disabled = true

actionBar.appendChild(cleanBtn)
actionBar.appendChild(zipBtn)
actionBar.appendChild(resetBtn)

// ---------- Features section ----------
const features = document.createElement('section')
features.id = 'features'
features.className =
  'max-w-7xl mx-auto px-6 py-20 border-t border-slate-800'
const featuresTitle = document.createElement('h2')
featuresTitle.className = 'text-2xl font-bold text-slate-100 mb-10 text-center tracking-tight'
featuresTitle.textContent = 'Forensic Architecture'
features.appendChild(featuresTitle)

const featureGrid = document.createElement('div')
featureGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'

const featuresData = [
  {
    title: 'Lossless APP Chunk Stripping',
    body:
      'JPEG APP1–APP15 chunks are removed at the binary marker level while preserving raw compressed image entropy 1:1 — no quality loss, no re-encode.',
  },
  {
    title: 'Deep Canvas Pixel Redraw',
    body:
      'PNG/WebP files are redrawn onto a standard HTML canvas, permanently destroying tEXt, zTXt, iTXt, and pHYs tracking payloads embedded in ancillary chunks.',
  },
  {
    title: 'Cryptographic Audit Manifest',
    body:
      'Client-side SHA-256 hashing before and after sanitization verifies no residual metadata survives, packaged into sanitization_report.json for compliance.',
  },
  {
    title: 'Air-Gapped In-Memory Pipeline',
    body:
      'Zero bytes ever leave device RAM. No uploads, no network calls, no telemetry — satisfying GDPR, HIPAA, and OPSEC operational requirements.',
  },
]
for (const feat of featuresData) {
  const card = document.createElement('div')
  card.className =
    'bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-600 transition-colors'
  const fTitle = document.createElement('h3')
  fTitle.className = 'text-base font-bold text-slate-100 mb-2'
  fTitle.textContent = feat.title
  card.appendChild(fTitle)
  const fBody = document.createElement('p')
  fBody.className = 'text-slate-400 text-sm leading-relaxed'
  fBody.textContent = feat.body
  card.appendChild(fBody)
  featureGrid.appendChild(card)
}
features.appendChild(featureGrid)

// ---------- Threat Matrix ----------
const matrix = document.createElement('section')
matrix.id = 'matrix'
matrix.className =
  'max-w-7xl mx-auto px-6 py-20 border-t border-slate-800'
const matrixTitle = document.createElement('h2')
matrixTitle.className = 'text-2xl font-bold text-slate-100 mb-8 text-center tracking-tight'
matrixTitle.textContent = 'Threat Matrix: What Gets Stripped'
matrix.appendChild(matrixTitle)

const tableWrap = document.createElement('div')
tableWrap.className = 'overflow-x-auto'

const table = document.createElement('table')
table.className = 'w-full text-left border-collapse'

const thead = document.createElement('thead')
const headerRow = document.createElement('tr')
headerRow.className = 'border-b border-slate-800 text-[10px] text-slate-400 font-mono uppercase tracking-wider'
for (const h of ['Metadata Field', 'Typical Camera / App Embeds', 'ZeroTrace Output']) {
  const th = document.createElement('th')
  th.className = 'py-4 font-semibold text-slate-300'
  th.textContent = h
  headerRow.appendChild(th)
}
thead.appendChild(headerRow)
table.appendChild(thead)

const tbody = document.createElement('tbody')
const matrixRows = [
  ['GPS Coordinates', 'Latitude + Longitude in EXIF', 'Removed — clean pixels only'],
  ['Device Serial / Unique ID', 'SerialNumber, OwnerName', 'Cleared — neutral headers'],
  ['Timestamps', 'DateTimeOriginal, ModifyDate', 'Scrubbed — no temporal traces'],
  ['Camera Specs', 'Make, Model, Lens, Software', 'Stripped — no device fingerprint'],
  ['PDF Info Dict', 'Title, Author, Producer, Creator', 'Emptied — zero document metadata'],
]
for (const row of matrixRows) {
  const tr = document.createElement('tr')
  tr.className = 'border-b border-slate-800/50'
  for (const cellText of row) {
    const td = document.createElement('td')
    td.className = 'py-3 px-2 text-sm'
    if (cellText === row[0]) {
      td.className += ' font-mono text-slate-300'
    } else if (cellText === row[2]) {
      td.className += ' text-emerald-400 font-mono'
    } else {
      td.className += ' text-slate-400'
    }
    td.textContent = cellText
    tr.appendChild(td)
  }
  tbody.appendChild(tr)
}
table.appendChild(tbody)
tableWrap.appendChild(table)
matrix.appendChild(tableWrap)

// ---------- Footer ----------
const footer = document.createElement('footer')
footer.className =
  'max-w-7xl mx-auto px-6 py-12 border-t border-slate-800 text-center'
const footerText = document.createElement('p')
footerText.className = 'text-slate-500 text-sm'
footerText.textContent =
  'ZeroTrace runs 100% locally in your browser. No files are uploaded to any server.'
footer.appendChild(footerText)

// ---------- Assemble ----------
app.appendChild(header)
app.appendChild(hero)
app.appendChild(actionBar)
app.appendChild(features)
app.appendChild(matrix)
app.appendChild(footer)

// ========================================================================
// STATE
// ========================================================================
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

// ========================================================================
// INGESTION
// ========================================================================
const dz = new Dropzone({
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

// Explicit Browse button triggers the hidden file input.
browseBtn.addEventListener('click', (e) => {
  e.preventDefault()
  dz.browse()
})

// ========================================================================
// SANITIZE
// ========================================================================
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

// ========================================================================
// EXPORT
// ========================================================================
zipBtn.addEventListener('click', () => {
  exportZip(sanitized)
})

// ========================================================================
// RESET
// ========================================================================
resetBtn.addEventListener('click', () => {
  parsed = []
  sanitized = []
  renderResults(results, [])
  updateActionBar()
  showToast('Memory buffers cleared.', 'success')
})

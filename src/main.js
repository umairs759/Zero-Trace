import './style.css'
import { Dropzone, showToast } from './modules/dropzone.js'
import { renderResults, revokeAllThumbnails } from './modules/uiRenderer.js'
import { stripFile, generateCleanName } from './modules/stripper.js'
import { exportZip, downloadBlob } from './modules/zipExporter.js'

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

const brandIcon = document.createElement('div')
brandIcon.className = 'w-6 h-6 text-emerald-400'
brandIcon.appendChild(
  (() => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'w-full h-full')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke', 'currentColor')
    svg.setAttribute('stroke-width', '1.5')
    svg.setAttribute('stroke-linecap', 'round')
    svg.setAttribute('stroke-linejoin', 'round')
    svg.setAttribute('viewBox', '0 0 24 24')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z')
    svg.appendChild(path)
    return svg
  })()
)
brand.appendChild(brandIcon)

const brandTitle = document.createElement('span')
brandTitle.className = 'text-xl font-black text-slate-100 tracking-tight'
brandTitle.textContent = 'ZeroTrace'
brand.appendChild(brandTitle)

const statusBadge = document.createElement('span')
statusBadge.className =
  'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
const statusDot = document.createElement('span')
statusDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse'
statusBadge.appendChild(statusDot)
const statusText = document.createElement('span')
statusText.textContent = 'Runs entirely in browser memory. Files never leave your device.'
statusBadge.appendChild(statusText)

header.appendChild(brand)
header.appendChild(statusBadge)

// ---------- Hero & Dropzone ----------
const hero = document.createElement('section')
hero.className = 'max-w-7xl mx-auto px-6 py-8 text-center'

const heroTitle = document.createElement('h1')
heroTitle.className = 'text-3xl md:text-5xl font-black text-slate-100 tracking-tight mb-4'
heroTitle.textContent = 'Metadata & EXIF Sanitizer'
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

const dropIconWrap = document.createElement('div')
dropIconWrap.className = 'w-12 h-12 mx-auto mb-3 text-slate-500'
dropIconWrap.appendChild(
  (() => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'w-full h-full')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke', 'currentColor')
    svg.setAttribute('stroke-width', '1.5')
    svg.setAttribute('stroke-linecap', 'round')
    svg.setAttribute('stroke-linejoin', 'round')
    svg.setAttribute('viewBox', '0 0 24 24')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4')
    svg.appendChild(path)
    return svg
  })()
)
dropzone.appendChild(dropIconWrap)

const dropHeading = document.createElement('h2')
dropHeading.className = 'text-lg font-semibold text-slate-100 mb-2'
dropHeading.textContent = 'Drop files here, paste from clipboard, or browse'
dropzone.appendChild(dropHeading)

const browseBtn = document.createElement('button')
browseBtn.type = 'button'
browseBtn.className =
  'mt-4 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg transition-transform active:scale-95 inline-flex items-center gap-2'
const browseIconWrap = document.createElement('span')
browseIconWrap.className = 'w-4 h-4'
browseIconWrap.appendChild(
  (() => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'w-full h-full')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke', 'currentColor')
    svg.setAttribute('stroke-width', '1.5')
    svg.setAttribute('stroke-linecap', 'round')
    svg.setAttribute('stroke-linejoin', 'round')
    svg.setAttribute('viewBox', '0 0 24 24')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z')
    svg.appendChild(path)
    return svg
  })()
)
browseBtn.appendChild(browseIconWrap)
const browseLabel = document.createElement('span')
browseLabel.textContent = 'Browse Files'
browseBtn.appendChild(browseLabel)
dropzone.appendChild(browseBtn)

const dropChips = document.createElement('div')
dropChips.className = 'mt-6 flex flex-wrap justify-center gap-2'
const chips = [
  'JPEG (Lossless)',
  'PNG/WebP (Canvas Redraw)',
  'PDF (Dictionary Wipe)',
  'Max 50MB per file',
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

// ---------- Format transparency note ----------
const formatNote = document.createElement('p')
formatNote.className =
  'text-[10px] text-slate-500 font-mono mb-6 max-w-2xl mx-auto leading-relaxed'
formatNote.textContent =
  'Format realities: JPEG — lossless APP marker stripping (zero quality loss) • PNG/WebP — canvas pixel re-encode • PDF — dictionary & metadata stream wipe.'
hero.appendChild(formatNote)

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
  'px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500'
cleanBtn.textContent = 'Clean 0 Files'
cleanBtn.disabled = true

const zipBtn = document.createElement('button')
zipBtn.type = 'button'
zipBtn.className =
  'px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500'
zipBtn.textContent = 'Download Clean ZIP'
zipBtn.disabled = true

const resetBtn = document.createElement('button')
resetBtn.type = 'button'
resetBtn.className =
  'px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
resetBtn.textContent = 'Clear / Reset'
resetBtn.disabled = true

actionBar.appendChild(cleanBtn)
actionBar.appendChild(zipBtn)
actionBar.appendChild(resetBtn)

// ---------- Documentation Section A: Threat Landscape ----------
const docs = document.createElement('section')
docs.id = 'docs'
docs.className =
  'max-w-7xl mx-auto px-6 py-20 border-t border-slate-800'

const docsTitle = document.createElement('h2')
docsTitle.className = 'text-2xl font-bold text-slate-100 mb-12 text-center tracking-tight'
docsTitle.textContent = 'Forensic Documentation'
docs.appendChild(docsTitle)

const docsGrid = document.createElement('div')
docsGrid.className = 'grid grid-cols-1 lg:grid-cols-2 gap-12'

// Section A
const sectionA = document.createElement('div')
sectionA.className = 'bg-slate-900 border border-slate-800 rounded-2xl p-8'

const aTitle = document.createElement('h3')
aTitle.className = 'text-lg font-bold text-slate-100 mb-6 flex items-center gap-2'
const aIconWrap = document.createElement('span')
aIconWrap.className = 'w-5 h-5 text-rose-500'
aIconWrap.appendChild(
  (() => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'w-full h-full')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke', 'currentColor')
    svg.setAttribute('stroke-width', '1.5')
    svg.setAttribute('stroke-linecap', 'round')
    svg.setAttribute('stroke-linejoin', 'round')
    svg.setAttribute('viewBox', '0 0 24 24')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z')
    svg.appendChild(path)
    return svg
  })()
)
aTitle.appendChild(aIconWrap)
const aTitleText = document.createElement('span')
aTitleText.textContent = 'Section A — The Threat Landscape: What Images Actually Leak'
aTitle.appendChild(aTitleText)
sectionA.appendChild(aTitle)

const aItems = [
  'Exact GPS home or office address embedded in EXIF coordinates',
  'Camera Serial Number — tied directly to your identity across photos',
  'OS build and software version revealing your device stack',
  'Hidden uncropped EXIF thumbnails of the original full image',
]
for (const itemText of aItems) {
  const item = document.createElement('div')
  item.className = 'flex items-start gap-3 mb-3'
  const dot = document.createElement('span')
  dot.className = 'w-1 h-1 bg-slate-500 rounded-full mt-2 flex-shrink-0'
  item.appendChild(dot)
  const text = document.createElement('p')
  text.className = 'text-sm text-slate-400 leading-relaxed'
  text.textContent = itemText
  item.appendChild(text)
  sectionA.appendChild(item)
}
docsGrid.appendChild(sectionA)

// Section B
const sectionB = document.createElement('div')
sectionB.className = 'bg-slate-900 border border-slate-800 rounded-2xl p-8'

const bTitle = document.createElement('h3')
bTitle.className = 'text-lg font-bold text-slate-100 mb-6 flex items-center gap-2'
const bIconWrap = document.createElement('span')
bIconWrap.className = 'w-5 h-5 text-cyan-500'
bIconWrap.appendChild(
  (() => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'w-full h-full')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke', 'currentColor')
    svg.setAttribute('stroke-width', '1.5')
    svg.setAttribute('stroke-linecap', 'round')
    svg.setAttribute('stroke-linejoin', 'round')
    svg.setAttribute('viewBox', '0 0 24 24')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z')
    svg.appendChild(path)
    return svg
  })()
)
bTitle.appendChild(bIconWrap)
const bTitleText = document.createElement('span')
bTitleText.textContent = 'Section B — Who Needs This & Real-World Use Cases'
bTitle.appendChild(bTitleText)
sectionB.appendChild(bTitle)

const bItems = [
  'Whistleblowers and investigative journalists protecting source identities',
  'Cybersecurity professionals conducting OSINT investigations without opsec leakage',
  'Everyday individuals posting car photos, real estate, or marketplace sales',
]
for (const itemText of bItems) {
  const item = document.createElement('div')
  item.className = 'flex items-start gap-3 mb-3'
  const dot = document.createElement('span')
  dot.className = 'w-1 h-1 bg-slate-500 rounded-full mt-2 flex-shrink-0'
  item.appendChild(dot)
  const text = document.createElement('p')
  text.className = 'text-sm text-slate-400 leading-relaxed'
  text.textContent = itemText
  item.appendChild(text)
  sectionB.appendChild(item)
}
docsGrid.appendChild(sectionB)

// Section C
const sectionC = document.createElement('div')
sectionC.className = 'bg-slate-900 border border-slate-800 rounded-2xl p-8'

const cTitle = document.createElement('h3')
cTitle.className = 'text-lg font-bold text-slate-100 mb-6 flex items-center gap-2'
const cIconWrap = document.createElement('span')
cIconWrap.className = 'w-5 h-5 text-emerald-500'
cIconWrap.appendChild(
  (() => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'w-full h-full')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke', 'currentColor')
    svg.setAttribute('stroke-width', '1.5')
    svg.setAttribute('stroke-linecap', 'round')
    svg.setAttribute('stroke-linejoin', 'round')
    svg.setAttribute('viewBox', '0 0 24 24')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M20 6L9 17l-5-5')
    svg.appendChild(path)
    return svg
  })()
)
cTitle.appendChild(cIconWrap)
const cTitleText = document.createElement('span')
cTitleText.textContent = 'Section C — How to Verify Zero Telemetry Yourself'
cTitle.appendChild(cTitleText)
sectionC.appendChild(cTitle)

const cSteps = [
  'Press F12 to open Developer Tools',
  'Go to the Network tab',
  'Drop an image or PDF into ZeroTrace',
  'Observe zero outbound network requests',
  'Disconnect Wi-Fi — the tool still works completely offline',
]
for (const stepText of cSteps) {
  const step = document.createElement('div')
  step.className = 'flex items-start gap-3 mb-3'
  const num = document.createElement('span')
  num.className = 'w-5 h-5 rounded-full bg-emerald-500 text-slate-950 text-xs font-bold flex items-center justify-center flex-shrink-0'
  num.textContent = String(cSteps.indexOf(stepText) + 1)
  step.appendChild(num)
  const text = document.createElement('p')
  text.className = 'text-sm text-slate-400 leading-relaxed'
  text.textContent = stepText
  step.appendChild(text)
  sectionC.appendChild(step)
}
docsGrid.appendChild(sectionC)

// Section D
const sectionD = document.createElement('div')
sectionD.className = 'bg-slate-900 border border-slate-800 rounded-2xl p-8'

const dTitle = document.createElement('h3')
dTitle.className = 'text-lg font-bold text-slate-100 mb-6 flex items-center gap-2'
const dIconWrap = document.createElement('span')
dIconWrap.className = 'w-5 h-5 text-amber-500'
dIconWrap.appendChild(
  (() => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'w-full h-full')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke', 'currentColor')
    svg.setAttribute('stroke-width', '1.5')
    svg.setAttribute('stroke-linecap', 'round')
    svg.setAttribute('stroke-linejoin', 'round')
    svg.setAttribute('viewBox', '0 0 24 24')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z')
    svg.appendChild(path)
    return svg
  })()
)
dTitle.appendChild(dIconWrap)
const dTitleText = document.createElement('span')
dTitleText.textContent = 'Section D — Realistic Limitations'
dTitle.appendChild(dTitleText)
sectionD.appendChild(dTitle)

const dItems = [
  'Metadata removal does not blur visible faces, license plates, or text written inside image pixels',
  'Canvas re-encode for PNG/WebP changes the file format (not byte-identical)',
  'PDF trailer dates may persist after info-dictionary clearing (pdf-lib limitation)',
]
for (const itemText of dItems) {
  const item = document.createElement('div')
  item.className = 'flex items-start gap-3 mb-3'
  const dot = document.createElement('span')
  dot.className = 'w-1 h-1 bg-slate-500 rounded-full mt-2 flex-shrink-0'
  item.appendChild(dot)
  const text = document.createElement('p')
  text.className = 'text-sm text-slate-400 leading-relaxed'
  text.textContent = itemText
  item.appendChild(text)
  sectionD.appendChild(item)
}
docsGrid.appendChild(sectionD)

docs.appendChild(docsGrid)

// ---------- Footer ----------
const footer = document.createElement('footer')
footer.className =
  'max-w-7xl mx-auto px-6 py-12 border-t border-slate-800 text-center'
const footerText = document.createElement('p')
footerText.className = 'text-slate-500 text-sm'
footerText.textContent =
  'ZeroTrace runs 100% locally in your browser. No files are uploaded to any server. Designed for strict OPSEC, field journalism, and data privacy workflows.'
footer.appendChild(footerText)

// ---------- Assemble ----------
app.appendChild(header)
app.appendChild(hero)
app.appendChild(actionBar)
app.appendChild(docs)
app.appendChild(footer)

// ========================================================================
// STATE
// ========================================================================
let parsed = []    // original file results (with buffer)
let sanitized = [] // sanitized file results (paired by index with parsed)

function updateActionBar() {
  const hasFiles = parsed.length > 0
  const hasSanitized = sanitized.length > 0

  cleanBtn.disabled = !hasFiles
  zipBtn.disabled = !hasSanitized
  resetBtn.disabled = !hasFiles && !hasSanitized

  // Dynamic button copy
  cleanBtn.textContent = hasFiles ? `Clean ${parsed.length} File${parsed.length > 1 ? 's' : ''}` : 'Clean 0 Files'

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
    revokeAllThumbnails()

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
    renderResults(results, parsed, { sanitizedMap: new Map() })
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
// SANITIZE + RE-VERIFY
// ========================================================================
cleanBtn.addEventListener('click', async () => {
  const newSanitized = []
  let failed = 0

  const { readMetadata } = await import('./modules/metadataReader.js')

  for (let i = 0; i < parsed.length; i++) {
    const file = parsed[i]
    try {
      const clean = await stripFile(file)

      // Re-verification: parse the clean buffer to confirm zero tags remain.
      const verify = await readMetadata(clean)
      const isVerified =
        verify.threatScore === 0 &&
        (verify.strippedTags || []).length === 0

      newSanitized.push({
        ...clean,
        originalName: file.name,
        originalHash: file.hash,
        verified: isVerified,
        verifiedTags: verify.strippedTags || [],
      })
    } catch (err) {
      failed++
      console.error('[ZeroTrace] strip failed:', err)
      newSanitized.push(null)
    }
  }

  sanitized = newSanitized

  const ok = sanitized.filter(Boolean).length
  showToast(
    failed === 0
      ? `Sanitized ${ok}/${parsed.length} file(s) successfully`
      : `Sanitized ${ok}/${parsed.length} file(s) (${failed} failed)`,
    failed === 0 ? 'success' : 'error'
  )

  // Re-render with before/after pairing (index-aligned)
  const sanitizedMap = new Map()
  sanitized.forEach((s, idx) => {
    if (s) sanitizedMap.set(idx, s)
  })

  renderResults(results, parsed, { sanitizedMap })
  updateActionBar()
})

// ========================================================================
// EXPORT (batch ZIP)
// ========================================================================
zipBtn.addEventListener('click', () => {
  const cleanOnly = sanitized.filter(Boolean)
  exportZip(cleanOnly)
})

// ========================================================================
// PER-FILE DOWNLOAD (delegated)
// ========================================================================
results.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-download-clean]')
  if (!btn) return
  const index = Number(btn.getAttribute('data-download-clean'))
  const file = sanitized[index]
  if (!file) return
  downloadBlob(
    new Blob([file.buffer], { type: file.type }),
    generateCleanName(file.originalName || file.name, index, file.type)
  )
})

// ========================================================================
// RESET
// ========================================================================
resetBtn.addEventListener('click', () => {
  parsed = []
  sanitized = []
  revokeAllThumbnails()
  renderResults(results, [], { sanitizedMap: new Map() })
  updateActionBar()
  showToast('Memory buffers cleared.', 'success')
})

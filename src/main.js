import './style.css'
import { Dropzone, showToast } from './modules/dropzone.js'
import { renderResults, revokeAllThumbnails } from './modules/uiRenderer.js'
import { stripFile, generateCleanName } from './modules/stripper.js'
import { exportZip } from './modules/zipExporter.js'

// ========================================================================
// UTILITIES
// ========================================================================

/**
 * Compute SHA-256 digest of a buffer via the native Web Crypto API.
 * @param {ArrayBuffer|ArrayBufferView} buffer
 * @returns {Promise<string>} 64-character lowercase hex string
 */
export async function computeHash(buffer) {
  if (!buffer) return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  const raw = buffer instanceof ArrayBuffer ? buffer : (buffer.buffer || buffer)
  const digest = await crypto.subtle.digest('SHA-256', raw)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Create an inline SVG icon (1.5px stroke, no emojis, no external assets).
 */
function createSvgIcon(pathData, className = 'w-5 h-5') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('class', className)
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.5')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('viewBox', '0 0 24 24')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', pathData)
  svg.appendChild(path)
  return svg
}

const ICONS = {
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
  file: 'M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z',
  image: 'M19 2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
  check: 'M20 6L9 17l-5-5',
  clean: 'M7 14l5-5 5 5',
  alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
}

// ========================================================================
// STATE
// ========================================================================
let parsed = []    // original file results (with buffer)
let sanitized = [] // sanitized file results (paired by index with parsed)

// ========================================================================
// SHELL BUILD (programmatic DOM — no reliance on index.html elements)
// ========================================================================

const app = document.getElementById('app')
if (!app) {
  throw new Error('ZeroTrace: #app mount point not found in index.html')
}

// ---------- Sticky Navbar ----------
const navbar = document.createElement('nav')
navbar.setAttribute('class', 'sticky top-0 z-50 px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between')

const brand = document.createElement('div')
brand.setAttribute('class', 'flex items-center gap-2')

const brandIcon = document.createElement('div')
brandIcon.setAttribute('class', 'w-6 h-6 text-emerald-400')
brandIcon.appendChild(createSvgIcon(ICONS.shield, 'w-full h-full'))

const brandTitle = document.createElement('span')
brandTitle.setAttribute('class', 'text-lg font-black text-zinc-100 tracking-tight')
brandTitle.textContent = 'ZeroTrace'

brand.appendChild(brandIcon)
brand.appendChild(brandTitle)

const statusBadge = document.createElement('span')
statusBadge.setAttribute('class', 'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20')
const statusDot = document.createElement('span')
statusDot.setAttribute('class', 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse')
statusBadge.appendChild(statusDot)
const statusText = document.createElement('span')
statusText.textContent = '100% IN-BROWSER MEMORY • ZERO TELEMETRY'
statusBadge.appendChild(statusText)

navbar.appendChild(brand)
navbar.appendChild(statusBadge)

// ---------- Hero Section ----------
const hero = document.createElement('section')
hero.setAttribute('class', 'max-w-6xl mx-auto px-6 py-10 text-center')

const heroTitle = document.createElement('h1')
heroTitle.setAttribute('class', 'text-3xl md:text-5xl font-black text-zinc-100 tracking-tight mb-4')
heroTitle.textContent = 'Enterprise Metadata & EXIF Sanitizer'
hero.appendChild(heroTitle)

const heroSub = document.createElement('p')
heroSub.setAttribute('class', 'text-zinc-400 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed')
heroSub.textContent = 'Scrub hidden GPS coordinates, device serials, and tracking trails from images and PDFs in browser memory before publishing.'
hero.appendChild(heroSub)

const dropzone = document.createElement('section')
dropzone.setAttribute('id', 'dropzone')
dropzone.setAttribute('class', 'border-2 border-dashed border-zinc-700 hover:border-emerald-500 bg-zinc-900/60 rounded-2xl p-8 md:p-12 text-center transition-all cursor-pointer shadow-lg relative mb-8')

const dropIconWrap = document.createElement('div')
dropIconWrap.setAttribute('class', 'w-12 h-12 mx-auto mb-3 text-zinc-500')
dropIconWrap.appendChild(createSvgIcon(ICONS.upload, 'w-full h-full'))
dropzone.appendChild(dropIconWrap)

const dropHeading = document.createElement('h2')
dropHeading.setAttribute('class', 'text-lg font-semibold text-zinc-100 mb-2')
dropHeading.textContent = 'Drop files here, paste from clipboard (Ctrl+V), or browse'
dropzone.appendChild(dropHeading)

const browseBtn = document.createElement('button')
browseBtn.setAttribute('type', 'button')
browseBtn.setAttribute('class', 'mt-4 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl shadow-lg transition-transform active:scale-95 inline-flex items-center gap-2')
const browseIcon = document.createElement('span')
browseIcon.setAttribute('class', 'w-4 h-4')
browseIcon.appendChild(createSvgIcon(ICONS.file, 'w-full h-full'))
browseBtn.appendChild(browseIcon)
const browseLabel = document.createElement('span')
browseLabel.textContent = 'Browse Files'
browseBtn.appendChild(browseLabel)
dropzone.appendChild(browseBtn)

const dropChips = document.createElement('div')
dropChips.setAttribute('class', 'mt-6 flex flex-wrap justify-center gap-2')
const chips = ['JPEG (Lossless)', 'PNG (Canvas Redraw)', 'WebP', 'PDF', 'Max 50MB']
for (const chipText of chips) {
  const chip = document.createElement('span')
  chip.setAttribute('class', 'text-[10px] px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700')
  chip.textContent = chipText
  dropChips.appendChild(chip)
}
dropzone.appendChild(dropChips)

const formatNote = document.createElement('p')
formatNote.setAttribute('class', 'text-[10px] text-zinc-500 font-mono mb-8 max-w-2xl mx-auto leading-relaxed')
formatNote.textContent = 'Format realities: JPEG — lossless APP marker stripping (zero quality loss) • PNG/WebP — canvas pixel re-encode • PDF — dictionary & metadata stream wipe.'
hero.appendChild(formatNote)

hero.appendChild(dropzone)

// ---------- Forensic Workbench ----------
const workbench = document.createElement('section')
workbench.setAttribute('id', 'workbench-container')
workbench.setAttribute('class', 'max-w-6xl mx-auto px-6')

const resultsArea = document.createElement('div')
resultsArea.setAttribute('id', 'results-area')
resultsArea.setAttribute('class', 'space-y-6')
workbench.appendChild(resultsArea)

// ---------- Sticky Action Bar ----------
const actionBar = document.createElement('section')
actionBar.setAttribute('id', 'action-bar')
actionBar.setAttribute('class', 'fixed bottom-0 left-0 right-0 z-50 px-6 py-4 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 hidden')

const actionInner = document.createElement('div')
actionInner.setAttribute('class', 'max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4')

const stagedCount = document.createElement('span')
stagedCount.setAttribute('id', 'staged-count')
stagedCount.setAttribute('class', 'text-xs text-zinc-500 font-mono')
stagedCount.textContent = '0 file(s) staged for sanitization'
actionInner.appendChild(stagedCount)

const cleanBtn = document.createElement('button')
cleanBtn.setAttribute('id', 'clean-btn')
cleanBtn.setAttribute('type', 'button')
cleanBtn.setAttribute('class', 'px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500')
cleanBtn.textContent = 'Sanitize 0 Files'
cleanBtn.disabled = true
actionInner.appendChild(cleanBtn)

const zipBtn = document.createElement('button')
zipBtn.setAttribute('id', 'zip-btn')
zipBtn.setAttribute('type', 'button')
zipBtn.setAttribute('class', 'px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500')
zipBtn.textContent = 'Download Clean ZIP'
zipBtn.disabled = true
actionInner.appendChild(zipBtn)

const resetBtn = document.createElement('button')
resetBtn.setAttribute('id', 'reset-btn')
resetBtn.setAttribute('type', 'button')
resetBtn.setAttribute('class', 'px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed')
resetBtn.textContent = 'Clear / Reset Workspace'
resetBtn.disabled = true
actionInner.appendChild(resetBtn)

actionBar.appendChild(actionInner)

// ---------- Documentation Section ----------
const docs = document.createElement('section')
docs.setAttribute('id', 'docs-section')
docs.setAttribute('class', 'max-w-6xl mx-auto px-6 py-20 border-t border-zinc-800/80')

const docsTitle = document.createElement('h2')
docsTitle.setAttribute('class', 'text-2xl font-bold text-zinc-100 mb-12 text-center tracking-tight')
docsTitle.textContent = 'Forensic Documentation'
docs.appendChild(docsTitle)

const docsGrid = document.createElement('div')
docsGrid.setAttribute('class', 'grid grid-cols-1 lg:grid-cols-2 gap-8')

// Section A: Threat Landscape
const sectionA = document.createElement('div')
sectionA.setAttribute('class', 'bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-8 backdrop-blur-sm')

const aTitle = document.createElement('h3')
aTitle.setAttribute('class', 'text-lg font-bold text-zinc-100 mb-6 flex items-center gap-2')
const aIcon = document.createElement('span')
aIcon.setAttribute('class', 'w-5 h-5 text-rose-500')
aIcon.appendChild(createSvgIcon(ICONS.alert, 'w-full h-full'))
aTitle.appendChild(aIcon)
const aTitleText = document.createElement('span')
aTitleText.textContent = 'Section A — What Photos & PDFs Actually Leak'
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
  item.setAttribute('class', 'flex items-start gap-3 mb-3')
  const dot = document.createElement('span')
  dot.setAttribute('class', 'w-1 h-1 bg-zinc-500 rounded-full mt-2 flex-shrink-0')
  item.appendChild(dot)
  const text = document.createElement('p')
  text.setAttribute('class', 'text-sm text-zinc-400 leading-relaxed')
  text.textContent = itemText
  item.appendChild(text)
  sectionA.appendChild(item)
}
docsGrid.appendChild(sectionA)

// Section B: Real-World Use Cases
const sectionB = document.createElement('div')
sectionB.setAttribute('class', 'bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-8 backdrop-blur-sm')

const bTitle = document.createElement('h3')
bTitle.setAttribute('class', 'text-lg font-bold text-zinc-100 mb-6 flex items-center gap-2')
const bIcon = document.createElement('span')
bIcon.setAttribute('class', 'w-5 h-5 text-cyan-500')
bIcon.appendChild(createSvgIcon(ICONS.shield, 'w-full h-full'))
bTitle.appendChild(bIcon)
const bTitleText = document.createElement('span')
bTitleText.textContent = 'Section B — Real-World Use Cases'
bTitle.appendChild(bTitleText)
sectionB.appendChild(bTitle)

const bItems = [
  'Journalists and whistleblowers protecting source identities',
  'OSINT analysts conducting investigations without opsec leakage',
  'Everyday individuals posting car photos, real estate, or marketplace sales',
]
for (const itemText of bItems) {
  const item = document.createElement('div')
  item.setAttribute('class', 'flex items-start gap-3 mb-3')
  const dot = document.createElement('span')
  dot.setAttribute('class', 'w-1 h-1 bg-zinc-500 rounded-full mt-2 flex-shrink-0')
  item.appendChild(dot)
  const text = document.createElement('p')
  text.setAttribute('class', 'text-sm text-zinc-400 leading-relaxed')
  text.textContent = itemText
  item.appendChild(text)
  sectionB.appendChild(item)
}
docsGrid.appendChild(sectionB)

// Section C: Verify It Yourself
const sectionC = document.createElement('div')
sectionC.setAttribute('class', 'bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-8 backdrop-blur-sm')

const cTitle = document.createElement('h3')
cTitle.setAttribute('class', 'text-lg font-bold text-zinc-100 mb-6 flex items-center gap-2')
const cIcon = document.createElement('span')
cIcon.setAttribute('class', 'w-5 h-5 text-emerald-500')
cIcon.appendChild(createSvgIcon(ICONS.check, 'w-full h-full'))
cTitle.appendChild(cIcon)
const cTitleText = document.createElement('span')
cTitleText.textContent = 'Section C — Verify It Yourself (Zero Telemetry Proof)'
cTitle.appendChild(cTitleText)
sectionC.appendChild(cTitle)

const cSteps = [
  'Open Chrome/Firefox DevTools (F12)',
  'Switch to the Network tab',
  'Ingest a file and click Sanitize — notice 0 requests made',
  'Disconnect internet/Wi-Fi — the tool still operates 100% offline',
]
for (const stepText of cSteps) {
  const step = document.createElement('div')
  step.setAttribute('class', 'flex items-start gap-3 mb-3')
  const num = document.createElement('span')
  num.setAttribute('class', 'w-5 h-5 rounded-full bg-emerald-500 text-zinc-950 text-xs font-bold flex items-center justify-center flex-shrink-0')
  num.textContent = String(cSteps.indexOf(stepText) + 1)
  step.appendChild(num)
  const text = document.createElement('p')
  text.setAttribute('class', 'text-sm text-zinc-400 leading-relaxed')
  text.textContent = stepText
  step.appendChild(text)
  sectionC.appendChild(step)
}
docsGrid.appendChild(sectionC)

// Section D: Boundaries & Limitations
const sectionD = document.createElement('div')
sectionD.setAttribute('class', 'bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-8 backdrop-blur-sm')

const dTitle = document.createElement('h3')
dTitle.setAttribute('class', 'text-lg font-bold text-zinc-100 mb-6 flex items-center gap-2')
const dIcon = document.createElement('span')
dIcon.setAttribute('class', 'w-5 h-5 text-amber-500')
dIcon.appendChild(createSvgIcon(ICONS.alert, 'w-full h-full'))
dTitle.appendChild(dIcon)
const dTitleText = document.createElement('span')
dTitleText.textContent = 'Section D — Boundaries & Limitations'
dTitle.appendChild(dTitleText)
sectionD.appendChild(dTitle)

const dItems = [
  'ZeroTrace scrubs file headers and metadata, not visible faces, car plates, or watermark pixels inside the photo',
  'Canvas re-encode for PNG/WebP changes the file format (not byte-identical)',
  'PDF trailer dates may persist after info-dictionary clearing (pdf-lib limitation)',
]
for (const itemText of dItems) {
  const item = document.createElement('div')
  item.setAttribute('class', 'flex items-start gap-3 mb-3')
  const dot = document.createElement('span')
  dot.setAttribute('class', 'w-1 h-1 bg-zinc-500 rounded-full mt-2 flex-shrink-0')
  item.appendChild(dot)
  const text = document.createElement('p')
  text.setAttribute('class', 'text-sm text-zinc-400 leading-relaxed')
  text.textContent = itemText
  item.appendChild(text)
  sectionD.appendChild(item)
}
docsGrid.appendChild(sectionD)

docs.appendChild(docsGrid)

// ---------- Footer ----------
const footer = document.createElement('footer')
footer.setAttribute('class', 'max-w-6xl mx-auto px-6 py-12 border-t border-zinc-800/80 text-center')
const footerText = document.createElement('p')
footerText.setAttribute('class', 'text-zinc-500 text-sm')
footerText.textContent = 'ZeroTrace runs 100% locally in your browser. No files are uploaded to any server. Designed for strict OPSEC, field journalism, and data privacy workflows.'
footer.appendChild(footerText)

// ---------- Assemble ----------
app.appendChild(navbar)
app.appendChild(hero)
app.appendChild(workbench)
app.appendChild(actionBar)
app.appendChild(docs)
app.appendChild(footer)

// ========================================================================
// DOM REFERENCES (now safe — all elements exist in the page)
// ========================================================================
const resultsEl = document.getElementById('results-area')
const actionBarEl = document.getElementById('action-bar')
const cleanBtnEl = document.getElementById('clean-btn')
const zipBtnEl = document.getElementById('zip-btn')
const resetBtnEl = document.getElementById('reset-btn')
const stagedCountEl = document.getElementById('staged-count')

// ========================================================================
// ACTION BAR STATE
// ========================================================================
function updateActionBar() {
  const hasFiles = parsed.length > 0
  const hasSanitized = sanitized.filter(Boolean).length > 0

  if (actionBarEl) actionBarEl.classList.toggle('hidden', !hasFiles)
  if (stagedCountEl) stagedCountEl.textContent = `${parsed.length} file(s) staged for sanitization`

  if (cleanBtnEl) {
    cleanBtnEl.disabled = !hasFiles
    cleanBtnEl.textContent = hasFiles ? `Sanitize ${parsed.length} File${parsed.length > 1 ? 's' : ''}` : 'Sanitize 0 Files'
  }
  if (zipBtnEl) zipBtnEl.disabled = !hasSanitized
  if (resetBtnEl) resetBtnEl.disabled = !hasFiles && !hasSanitized
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
        const sha = await computeHash(file.buffer)
        parsed.push({
          ...file,
          ...meta,
          buffer: file.buffer,
          sha256: sha,
          isSanitized: false,
        })
      } catch (e) {
        parsed.push({ ...file, isSanitized: false, sha256: await computeHash(file.buffer) })
      }
    }
    renderResults(resultsEl, parsed, handleCleanSingle)
    updateActionBar()
  },
  onError: (msg) => showToast(msg, 'error'),
})

// Browse button triggers hidden file input
browseBtn.addEventListener('click', (e) => {
  e.preventDefault()
  dz.browse()
})

// ========================================================================
// CLEAN SINGLE FILE
// ========================================================================
export async function handleCleanSingle(index) {
  const file = parsed[index]
  if (!file) return

  try {
    const res = await stripFile(file)
    const cleanBuf = res.buffer instanceof ArrayBuffer ? res.buffer : (res.buffer && res.buffer.buffer ? res.buffer.buffer : res.buffer)
    const cleanSha = await computeHash(cleanBuf)

    const { readMetadata } = await import('./modules/metadataReader.js')
    const verify = await readMetadata({ ...file, buffer: cleanBuf })
    const isVerified = verify.threatScore === 0 && (verify.strippedTags || []).length === 0

    file.sanitizedBuffer = cleanBuf
    file.sanitizedSha256 = cleanSha
    file.isSanitized = true
    file.verified = isVerified
    file.verifiedTags = verify.strippedTags || []
    file.hash = verify.hash || cleanSha
    file.threatScore = verify.threatScore || 0
    file.strippedTags = verify.strippedTags || []

    const idx = sanitized.findIndex((s) => s.name === file.name)
    if (idx >= 0) {
      sanitized[idx] = { name: file.name, type: res.type || file.type, buffer: cleanBuf, sha256: cleanSha }
    } else {
      sanitized.push({ name: file.name, type: res.type || file.type, buffer: cleanBuf, sha256: cleanSha })
    }

    renderResults(resultsEl, parsed, handleCleanSingle)
    updateActionBar()
    showToast(`Sanitized ${file.name} successfully`, 'success')
  } catch (err) {
    console.error(err)
    showToast(`Failed to clean file: ${err.message}`, 'error')
  }
}

// ========================================================================
// CLEAN ALL FILES
// ========================================================================
cleanBtnEl.addEventListener('click', async () => {
  for (let i = 0; i < parsed.length; i++) {
    if (!parsed[i].isSanitized) {
      await handleCleanSingle(i)
    }
  }
})

// ========================================================================
// DOWNLOAD ZIP
// ========================================================================
zipBtnEl.addEventListener('click', () => {
  const cleanOnly = sanitized.filter(Boolean)
  if (cleanOnly.length > 0) {
    exportZip(cleanOnly)
  }
})

// ========================================================================
// RESET
// ========================================================================
resetBtnEl.addEventListener('click', () => {
  parsed = []
  sanitized = []
  revokeAllThumbnails()
  renderResults(resultsEl, [], handleCleanSingle)
  updateActionBar()
  showToast('Memory buffers cleared', 'success')
})

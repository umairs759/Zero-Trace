// ZeroTrace — UI renderer (AstroWind/Linear-tier workbench)
// Strictly .textContent DOM construction — no innerHTML for user data.
// Tracks thumbnail object URLs for revocation on reset.

import { getRiskTier, THREAT_WEIGHTS } from '../utils/constants.js'

// ------------------------------------------------------------------
// Thumbnail object URL registry (for memory cleanup on reset)
// ------------------------------------------------------------------
const thumbnailUrls = new Set()

export function revokeAllThumbnails() {
  for (const url of thumbnailUrls) {
    URL.revokeObjectURL(url)
  }
  thumbnailUrls.clear()
}

/**
 * Format bytes into human-readable size.
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Truncate a SHA-256 hex string for display with copy indicator.
 */
export function truncateHash(hash) {
  if (!hash) return '—'
  return `${hash.slice(0, 12)}…${hash.slice(-12)}`
}

/**
 * Clear all content from a results container.
 */
export function clearResults(container) {
  container.textContent = ''
}

// ------------------------------------------------------------------
// Inline SVG icons (1.5px stroke, no emojis, no external assets)
// ------------------------------------------------------------------
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
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
  file: 'M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z',
  image: 'M19 2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z',
  copy: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
  check: 'M20 6L9 17l-5-5',
  alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  hash: 'M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z',
  arrowRight: 'M5 12h14',
  leftRight: 'M17 9l-7 7 7 7',
  refresh: 'M1 4v6a1 1 0 0 0 1 1h6',
  clean: 'M7 14l5-5 5 5',
}

/**
 * Render a single forensic file card with split Before/After diff.
 * @param {HTMLElement} container
 * @param {Object} result - parsed file result (original state)
 * @param {number} index - index in the parsed array (for sanitizedMap lookup)
 * @param {Object} options - { sanitizedMap: Map<number, Object> }
 */
export function renderFileCard(container, result, index, options = {}) {
  const { sanitizedMap } = options
  const sanitizedResult = sanitizedMap ? sanitizedMap.get(index) : undefined
  const card = document.createElement('article')
  card.className =
    'bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-6 overflow-hidden flex flex-col hover:border-zinc-600/50 transition-colors backdrop-blur-sm'

  // ---------- Card Header: thumbnail + metadata ----------
  const header = document.createElement('div')
  header.className = 'flex flex-col md:flex-row md:items-center gap-4 mb-6'

  // Thumbnail
  const thumb = document.createElement('div')
  thumb.className =
    'flex items-center justify-center w-32 h-32 bg-zinc-800/50 rounded-xl border border-zinc-800/50 relative overflow-hidden shrink-0'

  if (result.kind === 'image' && result.buffer) {
    const img = document.createElement('img')
    const blob = new Blob([result.buffer], { type: result.type || 'image/jpeg' })
    const url = URL.createObjectURL(blob)
    thumbnailUrls.add(url)
    img.src = url
    img.className = 'w-full h-full object-cover'
    img.alt = ''
    thumb.appendChild(img)
  } else {
    const iconWrap = document.createElement('div')
    iconWrap.className = 'text-zinc-500'
    iconWrap.appendChild(
      createSvgIcon(
        ICONS[result.kind === 'pdf' ? 'file' : 'image'],
        'w-10 h-10'
      )
    )
    thumb.appendChild(iconWrap)
  }
  header.appendChild(thumb)

  // File info
  const info = document.createElement('div')
  info.className = 'flex-1 min-w-0'

  const nameRow = document.createElement('div')
  nameRow.className = 'flex items-baseline gap-2 mb-1'

  const name = document.createElement('h3')
  name.className = 'text-base font-semibold text-zinc-100 truncate'
  name.textContent = result.file ? result.file.name : result.name || 'Unknown'
  nameRow.appendChild(name)

  const formatTag = document.createElement('span')
  formatTag.className =
    'text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-800 px-2 py-0.5 rounded ml-2 flex-shrink-0'
  formatTag.textContent =
    (result.file && result.file.type && result.file.type.split('/').pop().toUpperCase()) ||
    'FILE'
  nameRow.appendChild(formatTag)

  info.appendChild(nameRow)

  const size = document.createElement('div')
  size.className = 'text-xs text-zinc-500 font-mono'
  size.textContent = formatBytes(result.file ? result.file.size : result.size || 0)
  info.appendChild(size)

  header.appendChild(info)

  // SHA-256 + Threat Score (right side)
  const metaRight = document.createElement('div')
  metaRight.className = 'flex flex-col gap-3 md:items-end'

  const hashRow = document.createElement('div')
  hashRow.className = 'flex items-center gap-2'

  const hashLabel = document.createElement('span')
  hashLabel.className = 'text-[10px] text-zinc-500 font-mono uppercase tracking-wider'
  hashLabel.textContent = 'SHA-256'
  hashRow.appendChild(hashLabel)

  const hashValue = document.createElement('code')
  hashValue.className =
    'text-[10px] text-zinc-300 font-mono truncate max-w-[140px]'
  hashValue.textContent = truncateHash(result.hash)
  hashRow.appendChild(hashValue)

  const hashCopy = document.createElement('button')
  hashCopy.className =
    'text-[10px] text-zinc-500 hover:text-emerald-400 transition-colors p-1.5 rounded hover:bg-zinc-800'
  hashCopy.textContent = 'copy'
  hashCopy.title = 'Copy SHA-256 fingerprint'
  hashRow.appendChild(hashCopy)

  metaRight.appendChild(hashRow)

  const tier = result.riskTier || getRiskTier(0)
  const score = result.threatScore || 0

  const scoreRow = document.createElement('div')
  scoreRow.className = 'flex items-center gap-2'

  const scoreText = document.createElement('span')
  scoreText.className = 'text-xs font-bold text-zinc-300 uppercase tracking-wider'
  scoreText.textContent = `Threat Score — ${score}/100`
  scoreRow.appendChild(scoreText)

  const scoreTier = document.createElement('span')
  scoreTier.className = `text-[10px] font-bold px-2 py-0.5 rounded border ${tier.badge}`
  scoreTier.textContent = tier.label
  scoreRow.appendChild(scoreTier)

  metaRight.appendChild(scoreRow)

  const progressBar = document.createElement('div')
  progressBar.className = 'w-full h-1 bg-zinc-800 rounded-full overflow-hidden'
  const progressFill = document.createElement('div')
  const bgClass = tier.badge.split(' ')[0]
  progressFill.className = `h-full ${bgClass} transition-all duration-500`
  progressFill.style.width = `${Math.min(score, 100)}%`
  progressBar.appendChild(progressFill)
  metaRight.appendChild(progressBar)

  header.appendChild(metaRight)
  card.appendChild(header)

  // ---------- Before vs After Diff Matrix ----------
  const inspector = document.createElement('div')
  inspector.className = 'mt-2 border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-950/50'

  const inspectorHeader = document.createElement('div')
  inspectorHeader.className =
    'bg-zinc-800/40 px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between'
  const inspectorTitle = document.createElement('span')
  inspectorTitle.className = 'text-[10px] font-bold text-zinc-400 uppercase tracking-wider'
  inspectorTitle.textContent = 'Metadata Diff — Before vs After'
  inspectorHeader.appendChild(inspectorTitle)

  const verifiedBadge = document.createElement('span')
  verifiedBadge.className =
    'text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 hidden'
  verifiedBadge.textContent = 'VERIFIED CLEAN'
  inspectorHeader.appendChild(verifiedBadge)

  inspector.appendChild(inspectorHeader)

  const inspectorBody = document.createElement('div')
  inspectorBody.className = 'p-4 grid grid-cols-1 md:grid-cols-2 gap-4'

  // Column 1: Before (Original)
  const beforeCol = document.createElement('div')
  beforeCol.className = 'flex flex-col gap-3'

  const beforeLabel = document.createElement('div')
  beforeLabel.className = 'flex items-center gap-2'
  const beforeText = document.createElement('span')
  beforeText.className = 'text-[10px] font-bold text-rose-500 uppercase tracking-wider'
  beforeText.textContent = 'Before — Original Ingested Data'
  beforeLabel.appendChild(beforeText)
  beforeCol.appendChild(beforeLabel)

  const beforeList = document.createElement('div')
  beforeList.className = 'grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]'

  const beforeTags = result.strippedTags || []
  const beforeExif = result.exif || {}
  const beforePdf = result.pdfInfo || {}

  // Build before entries
  const beforeEntries = []
  if (beforeTags.includes('GPS Coordinates')) {
    beforeEntries.push(['GPS Latitude', beforeExif.latitude != null ? beforeExif.latitude.toFixed(6) : '—'])
    beforeEntries.push(['GPS Longitude', beforeExif.longitude != null ? beforeExif.longitude.toFixed(6) : '—'])
  }
  if (beforeTags.includes('Device Serial / Unique ID')) {
    beforeEntries.push(['Serial Number', beforeExif.serialNumber || '—'])
  }
  if (beforeTags.includes('Timestamps')) {
    beforeEntries.push(['Date Taken', beforeExif.dateTimeOriginal || '—'])
    beforeEntries.push(['Modify Date', beforeExif.modifyDate || '—'])
  }
  if (beforeTags.includes('Camera / Software specs')) {
    beforeEntries.push(['Camera Make', beforeExif.make || '—'])
    beforeEntries.push(['Camera Model', beforeExif.model || '—'])
    beforeEntries.push(['Software', beforeExif.software || '—'])
  }
  if (beforePdf.title) beforeEntries.push(['PDF Title', beforePdf.title])
  if (beforePdf.author) beforeEntries.push(['PDF Author', beforePdf.author])
  if (beforePdf.creator) beforeEntries.push(['PDF Creator', beforePdf.creator])
  if (beforePdf.producer) beforeEntries.push(['PDF Producer', beforePdf.producer])

  if (beforeEntries.length === 0) {
    const empty = document.createElement('span')
    empty.className = 'col-span-2 text-zinc-500 italic'
    empty.textContent = 'No metadata detected'
    beforeList.appendChild(empty)
  } else {
    for (const [label, value] of beforeEntries) {
      const k = document.createElement('dt')
      k.className = 'text-zinc-500'
      k.textContent = label

      const v = document.createElement('dd')
      v.className = 'text-zinc-200 font-mono truncate'
      v.textContent = String(value)

      beforeList.appendChild(k)
      beforeList.appendChild(v)
    }
  }
  beforeCol.appendChild(beforeList)

  // GPS warning banner
  if (result.gps) {
    const gpsBanner = document.createElement('div')
    gpsBanner.className =
      'mt-3 rounded-lg bg-rose-900/20 border border-rose-500/30 p-3'

    const gpsLabel = document.createElement('div')
    gpsLabel.className = 'text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1'
    const alertIcon = createSvgIcon(ICONS.alert, 'w-3 h-3')
    alertIcon.className += ' text-rose-400'
    gpsLabel.appendChild(alertIcon)
    const gpsText = document.createElement('span')
    gpsText.textContent = 'EXACT LOCATION EXPOSED'
    gpsLabel.appendChild(gpsText)
    gpsBanner.appendChild(gpsLabel)

    const gpsValue = document.createElement('div')
    gpsValue.className = 'text-xs text-zinc-200 font-mono'
    gpsValue.textContent = `Lat: ${result.gps.latitude.toFixed(6)}  •  Lon: ${result.gps.longitude.toFixed(6)}`
    gpsBanner.appendChild(gpsValue)

    beforeCol.appendChild(gpsBanner)
  }

  inspectorBody.appendChild(beforeCol)

  // Column 2: After (Sanitized)
  const afterCol = document.createElement('div')
  afterCol.className = 'flex flex-col gap-3'

  const afterLabel = document.createElement('div')
  afterLabel.className = 'flex items-center gap-2'
  const afterText = document.createElement('span')
  afterText.className = 'text-[10px] font-bold text-emerald-400 uppercase tracking-wider'
  afterText.textContent = 'After — Sanitized Status'
  afterLabel.appendChild(afterText)
  afterCol.appendChild(afterLabel)

  const afterList = document.createElement('div')
  afterList.className = 'grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]'

  const isVerified =
    sanitizedResult &&
    (sanitizedResult.threatScore || 0) === 0 &&
    (sanitizedResult.strippedTags || []).length === 0

  if (!sanitizedResult) {
    const pending = document.createElement('span')
    pending.className = 'col-span-2 text-zinc-500 italic'
    pending.textContent = 'Pending Sanitization'
    afterList.appendChild(pending)
  } else if (isVerified) {
    const cleanRow = document.createElement('div')
    cleanRow.className = 'col-span-2 flex items-center gap-2 text-emerald-400 font-mono text-[10px]'
    const check = createSvgIcon(ICONS.check, 'w-3 h-3')
    check.className += ' text-emerald-400'
    cleanRow.appendChild(check)
    const cleanText = document.createElement('span')
    cleanText.textContent = 'All tags stripped — VERIFIED CLEAN'
    cleanRow.appendChild(cleanText)
    afterList.appendChild(cleanRow)
    verifiedBadge.classList.remove('hidden')
  } else {
    const afterTags = sanitizedResult.strippedTags || []
    if (afterTags.length === 0) {
      const empty = document.createElement('span')
      empty.className = 'col-span-2 text-zinc-500 italic'
      empty.textContent = 'No metadata detected'
      afterList.appendChild(empty)
    } else {
      for (const tag of afterTags) {
        const k = document.createElement('dt')
        k.className = 'text-zinc-500'
        k.textContent = tag

        const v = document.createElement('dd')
        v.className = 'text-rose-300 font-mono'
        v.textContent = 'REMAINING'

        afterList.appendChild(k)
        afterList.appendChild(v)
      }
    }
  }
  afterCol.appendChild(afterList)

  // SHA-256 comparison (after column)
  const hashCompare = document.createElement('div')
  hashCompare.className = 'mt-4 pt-4 border-t border-zinc-800/80'

  const hashCompareLabel = document.createElement('div')
  hashCompareLabel.className = 'text-[10px] text-zinc-500 font-mono uppercase tracking-wider mb-2'
  hashCompareLabel.textContent = 'Cryptographic Comparison'
  hashCompare.appendChild(hashCompareLabel)

  const hashRows = [
    ['Original', result.hash],
    ['Sanitized', sanitizedResult ? sanitizedResult.hash : '—'],
  ]
  for (const [label, value] of hashRows) {
    const row = document.createElement('div')
    row.className = 'flex items-center justify-between gap-2 mb-1'

    const lbl = document.createElement('span')
    lbl.className = 'text-[10px] text-zinc-500 font-mono'
    lbl.textContent = label
    row.appendChild(lbl)

    const val = document.createElement('code')
    val.className =
      'text-[10px] font-mono truncate max-w-[130px] ' +
      (label === 'Sanitized' && isVerified ? 'text-emerald-400' : 'text-zinc-300')
    val.textContent = truncateHash(value)
    row.appendChild(val)
    hashCompare.appendChild(row)
  }
  afterCol.appendChild(hashCompare)

  inspectorBody.appendChild(afterCol)
  inspector.appendChild(inspectorBody)
  card.appendChild(inspector)

  // ---------- Card Actions ----------
  const actions = document.createElement('div')
  actions.className = 'mt-6 flex flex-col sm:flex-row sm:items-end gap-3 pt-4 border-t border-zinc-800/80'

  if (sanitizedResult) {
    const downloadBtn = document.createElement('button')
    downloadBtn.className =
      'w-full sm:w-auto px-4 py-2.5 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 underline decoration-1 decoration-cyan-500/30 hover:decoration-cyan-400 transition-all rounded bg-cyan-900/20 border border-cyan-900/30 text-left flex items-center gap-2'
    downloadBtn.setAttribute('data-download-clean', String(index))
    const downIcon = createSvgIcon(ICONS.download, 'w-3 h-3 text-cyan-400')
    downloadBtn.appendChild(downIcon)
    const downLabel = document.createElement('span')
    downLabel.textContent = 'Download Sanitized File'
    downloadBtn.appendChild(downLabel)
    actions.appendChild(downloadBtn)
  }

  const cleanBtn = document.createElement('button')
  cleanBtn.className =
    'w-full sm:w-auto px-4 py-2.5 text-[11px] font-bold text-zinc-100 hover:text-zinc-50 transition-colors rounded bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 flex items-center gap-2'
  cleanBtn.setAttribute('data-clean-file', String(index))
  const cleanIcon = createSvgIcon(ICONS.clean, 'w-3 h-3')
  cleanBtn.appendChild(cleanIcon)
  const cleanLabel = document.createElement('span')
  cleanLabel.textContent = sanitizedResult ? 'Re-Clean This File' : 'Clean This File'
  cleanBtn.appendChild(cleanLabel)
  actions.appendChild(cleanBtn)

  card.appendChild(actions)
  container.appendChild(card)
}

/**
 * Render the full results grid into the container.
 */
export function renderResults(container, results, options = {}) {
  clearResults(container)

  if (!results || results.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'text-zinc-500 text-sm text-center py-12'
    empty.textContent = 'No files parsed yet. Drop an image or PDF to begin.'
    container.appendChild(empty)
    return
  }

  const count = document.createElement('p')
  count.className = 'text-xs text-zinc-500 mb-6 font-mono'
  count.textContent = `${results.length} file(s) staged for sanitization`
  container.appendChild(count)

  const grid = document.createElement('div')
  grid.className = 'space-y-6'
  for (let i = 0; i < results.length; i++) {
    renderFileCard(grid, results[i], i, options)
  }
  container.appendChild(grid)
}

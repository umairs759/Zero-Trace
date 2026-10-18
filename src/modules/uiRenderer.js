// ZeroTrace — UI renderer (Agency-Grade)
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
// Inline SVG icons (2px stroke, no emojis, no external assets)
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
}

/**
 * Render a single forensic file card with Before/After inspector.
 * @param {HTMLElement} container
 * @param {Object} result - parsed file result (original state)
 * @param {number} index - index in the parsed array (for sanitizedMap lookup)
 * @param {Object} options - { sanitizedMap: Map<number, Object>, onDownloadClean }
 */
export function renderFileCard(container, result, index, options = {}) {
  const { sanitizedMap } = options
  const sanitizedResult = sanitizedMap ? sanitizedMap.get(index) : undefined
  const card = document.createElement('article')
  card.className =
    'bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-hidden flex flex-col group hover:border-slate-600 transition-colors'

  // ---------- Thumbnail / file icon ----------
  const thumb = document.createElement('div')
  thumb.className =
    'flex items-center justify-center h-32 bg-slate-800/50 rounded-xl mb-3 border border-slate-800/50 relative overflow-hidden'

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
    iconWrap.className = 'text-slate-500'
    iconWrap.appendChild(
      createSvgIcon(ICONS[result.kind === 'pdf' ? 'file' : 'image'], 'w-10 h-10')
    )
    thumb.appendChild(iconWrap)
  }
  card.appendChild(thumb)

  // ---------- Header: name + size ----------
  const header = document.createElement('div')
  header.className = 'flex items-baseline justify-between gap-2 mb-2'

  const name = document.createElement('h3')
  name.className = 'text-sm font-semibold text-slate-100 truncate'
  name.textContent = result.file ? result.file.name : result.name || 'Unknown'
  header.appendChild(name)

  const size = document.createElement('span')
  size.className = 'text-xs text-slate-500 font-mono'
  size.textContent = formatBytes(result.file ? result.file.size : result.size || 0)
  header.appendChild(size)

  card.appendChild(header)

  // ---------- SHA-256 fingerprint ----------
  const hashRow = document.createElement('div')
  hashRow.className = 'flex items-center gap-2 mb-2'

  const hashLabel = document.createElement('span')
  hashLabel.className = 'text-[10px] text-slate-500 font-mono uppercase tracking-wider'
  hashLabel.textContent = 'SHA-256'
  hashRow.appendChild(hashLabel)

  const hashValue = document.createElement('code')
  hashValue.className =
    'text-[10px] text-slate-300 font-mono truncate flex-1 max-w-[150px]'
  hashValue.textContent = truncateHash(result.hash)
  hashRow.appendChild(hashValue)

  const hashCopy = document.createElement('button')
  hashCopy.className =
    'text-[10px] text-slate-500 hover:text-emerald-400 transition-colors p-1.5 rounded hover:bg-slate-800'
  hashCopy.textContent = 'copy'
  hashCopy.title = 'Copy SHA-256 fingerprint'
  hashRow.appendChild(hashCopy)

  card.appendChild(hashRow)

  // ---------- Threat Score meter ----------
  const tier = result.riskTier || getRiskTier(0)
  const score = result.threatScore || 0

  const scoreLabel = document.createElement('div')
  scoreLabel.className = 'flex items-center justify-between mb-1'
  const scoreText = document.createElement('span')
  scoreText.className = 'text-xs font-bold text-slate-300 uppercase tracking-wider'
  scoreText.textContent = `Threat Score — ${score}/100`
  scoreLabel.appendChild(scoreText)

  const scoreTier = document.createElement('span')
  scoreTier.className = `text-[10px] font-bold px-2 py-0.5 rounded border ${tier.badge}`
  scoreTier.textContent = tier.label
  scoreLabel.appendChild(scoreTier)

  card.appendChild(scoreLabel)

  const progressBar = document.createElement('div')
  progressBar.className = 'w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3'
  const progressFill = document.createElement('div')
  const bgClass = tier.badge.split(' ')[0]
  progressFill.className = `h-full ${bgClass} transition-all duration-500`
  progressFill.style.width = `${Math.min(score, 100)}%`
  progressBar.appendChild(progressFill)
  card.appendChild(progressBar)

  // ---------- Before vs After metadata inspector ----------
  const inspector = document.createElement('div')
  inspector.className = 'mt-3 border border-slate-800 rounded-xl overflow-hidden'

  const inspectorHeader = document.createElement('div')
  inspectorHeader.className =
    'bg-slate-800/50 px-3 py-2 border-b border-slate-800 flex items-center justify-between'
  const inspectorTitle = document.createElement('span')
  inspectorTitle.className = 'text-[10px] font-bold text-slate-400 uppercase tracking-wider'
  inspectorTitle.textContent = 'Before vs After'
  inspectorHeader.appendChild(inspectorTitle)

  const verifiedBadge = document.createElement('span')
  verifiedBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 hidden'
  verifiedBadge.textContent = 'Verified Clean'
  inspectorHeader.appendChild(verifiedBadge)

  inspector.appendChild(inspectorHeader)

  const inspectorBody = document.createElement('div')
  inspectorBody.className = 'px-3 py-3'

  // Before tags
  const beforeSection = document.createElement('div')
  beforeSection.className = 'mb-3'

  const beforeLabel = document.createElement('div')
  beforeLabel.className = 'text-[10px] text-rose-500 font-mono uppercase tracking-wider mb-1 flex items-center gap-1'
  const alertIcon = createSvgIcon(ICONS.alert, 'w-3 h-3')
  alertIcon.className += ' text-rose-500'
  beforeLabel.appendChild(alertIcon)
  const beforeText = document.createElement('span')
  beforeText.textContent = 'Before Sanitization'
  beforeLabel.appendChild(beforeText)
  beforeSection.appendChild(beforeLabel)

  const beforeList = document.createElement('div')
  beforeList.className = 'grid grid-cols-2 gap-1 text-[10px] leading-tight'

  const beforeTags = result.strippedTags || []
  if (beforeTags.length === 0) {
    const empty = document.createElement('span')
    empty.className = 'col-span-2 text-slate-500 italic'
    empty.textContent = 'No metadata detected'
    beforeList.appendChild(empty)
  } else {
    for (const tag of beforeTags) {
      const k = document.createElement('dt')
      k.className = 'text-slate-500'
      k.textContent = tag

      const v = document.createElement('dd')
      v.className = 'text-rose-300 font-mono'
      v.textContent = 'DETECTED'

      beforeList.appendChild(k)
      beforeList.appendChild(v)
    }
  }
  beforeSection.appendChild(beforeList)
  inspectorBody.appendChild(beforeSection)

  // After tags (re-verification)
  const afterSection = document.createElement('div')

  const afterLabel = document.createElement('div')
  afterLabel.className = 'text-[10px] text-emerald-500 font-mono uppercase tracking-wider mb-1 flex items-center gap-1'
  const checkIcon = createSvgIcon(ICONS.check, 'w-3 h-3')
  checkIcon.className += ' text-emerald-500'
  afterLabel.appendChild(checkIcon)
  const afterText = document.createElement('span')
  afterText.textContent = 'After Sanitization (Re-Verified)'
  afterLabel.appendChild(afterText)
  afterSection.appendChild(afterLabel)

  const afterList = document.createElement('div')
  afterList.className = 'grid grid-cols-2 gap-1 text-[10px] leading-tight'

  const afterTags = sanitizedResult ? (sanitizedResult.strippedTags || []) : []
  const isVerified = sanitizedResult && (sanitizedResult.threatScore || 0) === 0 && afterTags.length === 0

  if (isVerified) {
    const verifiedRow = document.createElement('div')
    verifiedRow.className = 'col-span-2 flex items-center gap-1 text-emerald-400 font-mono text-[10px]'
    const check = createSvgIcon(ICONS.check, 'w-3 h-3')
    check.className += ' text-emerald-400'
    verifiedRow.appendChild(check)
    const verifiedText = document.createElement('span')
    verifiedText.textContent = '0 tags remaining — clean'
    verifiedRow.appendChild(verifiedText)
    afterList.appendChild(verifiedRow)
    verifiedBadge.classList.remove('hidden')
  } else if (afterTags.length === 0) {
    const empty = document.createElement('span')
    empty.className = 'col-span-2 text-slate-500 italic'
    empty.textContent = 'No metadata detected'
    afterList.appendChild(empty)
  } else {
    for (const tag of afterTags) {
      const k = document.createElement('dt')
      k.className = 'text-slate-500'
      k.textContent = tag

      const v = document.createElement('dd')
      v.className = 'text-rose-300 font-mono'
      v.textContent = 'REMAINING'

      afterList.appendChild(k)
      afterList.appendChild(v)
    }
  }
  afterSection.appendChild(afterList)
  inspectorBody.appendChild(afterSection)

  // SHA-256 comparison
  const hashCompare = document.createElement('div')
  hashCompare.className = 'mt-3 pt-3 border-t border-slate-800'

  const hashCompareLabel = document.createElement('div')
  hashCompareLabel.className = 'text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-2'
  hashCompareLabel.textContent = 'Cryptographic Comparison'
  hashCompare.appendChild(hashCompareLabel)

  const hashRows = [
    ['Original SHA-256', result.hash],
    ['Sanitized SHA-256', sanitizedResult ? sanitizedResult.hash : '—'],
  ]
  for (const [label, value] of hashRows) {
    const row = document.createElement('div')
    row.className = 'flex items-center justify-between gap-2 mb-1'

    const lbl = document.createElement('span')
    lbl.className = 'text-[10px] text-slate-500 font-mono'
    lbl.textContent = label
    row.appendChild(lbl)

    const val = document.createElement('code')
    val.className =
      'text-[10px] font-mono truncate max-w-[140px] ' +
      (label === 'Sanitized SHA-256' && isVerified ? 'text-emerald-400' : 'text-slate-300')
    val.textContent = truncateHash(value)
    row.appendChild(val)
    hashCompare.appendChild(row)
  }
  inspectorBody.appendChild(hashCompare)

  inspector.appendChild(inspectorBody)
  card.appendChild(inspector)

  // ---------- GPS Location card ----------
  if (result.gps) {
    const gpsCard = document.createElement('div')
    gpsCard.className =
      'mt-2 rounded-xl bg-rose-900/30 border border-rose-500/30 p-3'

    const gpsLabel = document.createElement('div')
    gpsLabel.className = 'text-[10px] text-rose-400 font-mono uppercase tracking-wider mb-1 flex items-center gap-1'
    gpsLabel.textContent = 'GPS Telemetry Detected'
    gpsCard.appendChild(gpsLabel)

    const gpsValue = document.createElement('div')
    gpsValue.className = 'text-xs text-rose-100 font-mono mb-2 break-all'
    gpsValue.textContent = `Lat: ${result.gps.latitude.toFixed(6)}  •  Lon: ${result.gps.longitude.toFixed(6)}`
    gpsCard.appendChild(gpsValue)

    if (result.gps.osmUrl) {
      const osmBtn = document.createElement('button')
      osmBtn.className =
        'w-full text-[10px] text-emerald-400 hover:text-emerald-300 underline decoration-1 decoration-emerald-500/30 hover:decoration-emerald-400 transition-all py-2 rounded bg-emerald-900/20 border border-emerald-900/30 text-left'
      osmBtn.textContent = 'View on OpenStreetMap'
      osmBtn.title = 'View location on OpenStreetMap'
      osmBtn.addEventListener('click', () => {
        window.open(result.gps.osmUrl, '_blank', 'noopener,noreferrer')
      })
      gpsCard.appendChild(osmBtn)
    }

    card.appendChild(gpsCard)
  }

  // ---------- Per-file download ----------
  if (sanitizedResult) {
    const downloadRow = document.createElement('div')
    downloadRow.className = 'mt-3'

    const downloadBtn = document.createElement('button')
    downloadBtn.className =
      'w-full text-[10px] text-cyan-400 hover:text-cyan-300 underline decoration-1 decoration-cyan-500/30 hover:decoration-cyan-400 transition-all py-2 rounded bg-cyan-900/20 border border-cyan-900/30 text-left flex items-center gap-2'
    downloadBtn.setAttribute('data-download-clean', String(index))
    const downIcon = createSvgIcon(ICONS.download, 'w-3 h-3 text-cyan-400')
    downloadBtn.appendChild(downIcon)
    const downLabel = document.createElement('span')
    downLabel.textContent = `Download Clean File`
    downloadBtn.appendChild(downLabel)
    downloadRow.appendChild(downloadBtn)

    card.appendChild(downloadRow)
  }

  container.appendChild(card)
}

/**
 * Render the full results grid into the container.
 */
export function renderResults(container, results, options = {}) {
  clearResults(container)

  if (!results || results.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'text-slate-500 text-sm text-center py-8'
    empty.textContent = 'No files parsed yet. Drop an image or PDF to begin.'
    container.appendChild(empty)
    return
  }

  const count = document.createElement('p')
  count.className = 'text-xs text-slate-500 mb-4 font-mono'
  count.textContent = `${results.length} file(s) parsed`
  container.appendChild(count)

  const grid = document.createElement('div')
  grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
  for (let i = 0; i < results.length; i++) {
    renderFileCard(grid, results[i], i, options)
  }
  container.appendChild(grid)
}

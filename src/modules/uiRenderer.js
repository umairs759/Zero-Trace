// ZeroTrace — UI renderer (T-006)
// Renders Cyber-Defense metadata cards and color-codes risk tiers.
// Uses DOM text nodes exclusively (.textContent) — never innerHTML — to
// neutralize DOM-based XSS from user-controlled EXIF/PDF strings.

import { getRiskTier } from '../utils/constants.js'

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

/**
 * Render a single Cyber-Defense metadata card into the given container.
 */
export function renderFileCard(container, result) {
  const card = document.createElement('article')
  card.className =
    'bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-hidden flex flex-col hover:border-slate-600 transition-colors'

  // ---------- Thumbnail / file icon ----------
  const thumb = document.createElement('div')
  thumb.className =
    'flex items-center justify-center h-24 bg-slate-800/50 rounded-xl mb-3 border border-slate-800/50 text-slate-500'
  const thumbIcon = document.createElement('span')
  thumbIcon.className = 'text-2xl'
  thumbIcon.textContent =
    result.kind === 'pdf' ? '📄' : '🖼️'
  thumb.appendChild(thumbIcon)
  card.appendChild(thumb)

  // ---------- Header: name + size ----------
  const header = document.createElement('div')
  header.className = 'flex items-baseline justify-between gap-2 mb-2'

  const name = document.createElement('h3')
  name.className = 'text-sm font-semibold text-slate-100 truncate'
  name.textContent = result.file.name || 'Unknown'
  header.appendChild(name)

  const size = document.createElement('span')
  size.className = 'text-xs text-slate-500 font-mono'
  size.textContent = formatBytes(result.file.size || 0)
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

  // ---------- GPS Location card ----------
  if (result.gps) {
    const gpsCard = document.createElement('div')
    gpsCard.className =
      'mt-2 rounded-xl bg-rose-900/30 border border-rose-500/30 p-3'

    const gpsLabel = document.createElement('div')
    gpsLabel.className = 'text-[10px] text-rose-400 font-mono uppercase tracking-wider mb-1 flex items-center gap-1'
    gpsLabel.textContent = '⚠ GPS Telemetry Detected'
    gpsCard.appendChild(gpsLabel)

    const gpsValue = document.createElement('div')
    gpsValue.className = 'text-xs text-rose-100 font-mono mb-2 break-all'
    gpsValue.textContent = `Lat: ${result.gps.latitude.toFixed(6)}  •  Lon: ${result.gps.longitude.toFixed(6)}`
    gpsCard.appendChild(gpsValue)

    const osmBtn = document.createElement('button')
    osmBtn.className =
      'w-full text-[10px] text-emerald-400 hover:text-emerald-300 underline decoration-1 decoration-emerald-500/30 hover:decoration-emerald-400 transition-all py-2 rounded bg-emerald-900/20 border border-emerald-900/30 text-left'
    osmBtn.textContent = 'View on OpenStreetMap'
    osmBtn.title = 'View location on OpenStreetMap'
    osmBtn.addEventListener('click', () => {
      if (result.gps.osmUrl) {
        window.open(result.gps.osmUrl, '_blank', 'noopener,noreferrer')
      }
    })
    gpsCard.appendChild(osmBtn)

    card.appendChild(gpsCard)
  }

  // ---------- Metadata table ----------
  const fields =
    result.kind === 'image' && result.exif
      ? imageFields(result.exif)
      : result.kind === 'pdf' && result.pdfInfo
      ? pdfFields(result.pdfInfo)
      : []

  if (fields.length > 0) {
    const metaLabel = document.createElement('div')
    metaLabel.className = 'mt-3 text-[10px] text-slate-500 font-mono uppercase tracking-wider'
    metaLabel.textContent = 'Extracted Tags'
    card.appendChild(metaLabel)

    const meta = document.createElement('dl')
    meta.className = 'grid grid-cols-2 gap-1 text-[10px] leading-tight'
    for (const [label, value] of fields) {
      const dt = document.createElement('dt')
      dt.className = 'text-slate-500'
      dt.textContent = label

      const dd = document.createElement('dd')
      dd.className =
        'text-slate-200 font-mono truncate max-w-[160px] overflow-hidden'
      dd.textContent = value ?? '—'

      meta.appendChild(dt)
      meta.appendChild(dd)
    }
    card.appendChild(meta)
  } else if (!result.error && !result.gps) {
    const none = document.createElement('p')
    none.className = 'mt-2 text-[10px] text-slate-500 italic'
    none.textContent = 'No metadata found.'
    card.appendChild(none)
  }

  // ---------- Error state ----------
  if (result.error) {
    const err = document.createElement('p')
    err.className = 'mt-2 text-[10px] text-rose-400'
    err.textContent = `Error: ${result.error}`
    card.appendChild(err)
  }

  container.appendChild(card)
}

/**
 * Render the full results grid into the container.
 */
export function renderResults(container, results) {
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
  for (const result of results) {
    renderFileCard(grid, result)
  }
  container.appendChild(grid)
}

function imageFields(exif) {
  const fields = []
  const push = (label, value) => {
    if (value != null && value !== '') fields.push([label, String(value)])
  }
  push('Make', exif.make)
  push('Model', exif.model)
  push('Software', exif.software)
  push(
    'Dimensions',
    exif.width && exif.height ? `${exif.width} × ${exif.height}` : null
  )
  push('Date Taken', exif.dateTimeOriginal)
  push('ISO', exif.iso)
  push('Aperture', exif.aperture)
  push('Shutter', exif.shutterSpeed)
  push('Focal Length', exif.focalLength)
  return fields
}

function pdfFields(info) {
  const fields = []
  const push = (label, value) => {
    if (value != null && value !== '') fields.push([label, String(value)])
  }
  push('Title', info.title)
  push('Author', info.author)
  push('Subject', info.subject)
  push('Creator', info.creator)
  push('Producer', info.producer)
  push('Pages', info.pageCount)
  push('Created', info.creationDate)
  push('Modified', info.modificationDate)
  return fields
}

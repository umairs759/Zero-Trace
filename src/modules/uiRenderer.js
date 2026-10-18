// ZeroTrace — UI renderer (T-006)
// Renders Cyber-Defense metadata cards and color-codes risk tiers.
// Uses DOM text nodes exclusively (.textContent) — never innerHTML — to
// neutralize DOM-based XSS from user-controlled EXIF/PDF strings.

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
    'bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-hidden flex flex-col'

  // ---------- Header: name + type badge ----------
  const header = document.createElement('div')
  header.className = 'flex items-center justify-between gap-2 mb-2'

  const name = document.createElement('h3')
  name.className = 'text-sm font-semibold text-slate-100 truncate'
  name.textContent = result.file.name || 'Unknown'
  header.appendChild(name)

  const typeBadge = document.createElement('span')
  typeBadge.className =
    'text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400'
  typeBadge.textContent =
    (result.file.type && result.file.type.split('/').pop().toUpperCase()) ||
    '—'
  header.appendChild(typeBadge)

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
    'text-[10px] text-slate-300 font-mono truncate max-w-[140px]'
  hashValue.textContent = truncateHash(result.hash)
  hashRow.appendChild(hashValue)

  const hashCopy = document.createElement('button')
  hashCopy.className =
    'text-[10px] text-slate-500 hover:text-emerald-400 transition-colors'
  hashCopy.textContent = 'copy'
  hashCopy.title = 'Copy SHA-256 fingerprint'
  hashRow.appendChild(hashCopy)

  card.appendChild(hashRow)

  // ---------- Threat Score badge ----------
  const tier = result.riskTier || { label: 'CLEAN / LOW', badge: 'bg-emerald-900/40 text-emerald-500 border-emerald-500/30' }
  const score = document.createElement('div')
  score.className = `mb-2 px-2 py-1 rounded text-xs font-bold border text-center ${
    tier.badge
  }`
  score.textContent = `Threat ${tier.label} — ${result.threatScore || 0}/100`
  card.appendChild(score)

  // ---------- GPS Location card ----------
  if (result.gps) {
    const gpsCard = document.createElement('div')
    gpsCard.className =
      'mt-2 rounded bg-rose-900/30 border border-rose-500/30 p-2'

    const gpsLabel = document.createElement('div')
    gpsLabel.className = 'text-[10px] text-rose-400 font-mono uppercase tracking-wider mb-1'
    gpsLabel.textContent = 'GPS Location Detected'
    gpsCard.appendChild(gpsLabel)

    const gpsValue = document.createElement('div')
    gpsValue.className = 'text-xs text-rose-100 font-mono mb-2 break-all'
    gpsValue.textContent = `Lat: ${result.gps.latitude.toFixed(6)}, Lon: ${result.gps.longitude.toFixed(6)}`
    gpsCard.appendChild(gpsValue)

    const osmBtn = document.createElement('button')
    osmBtn.className =
      'w-full text-[10px] text-emerald-400 hover:text-emerald-300 underline decoration-1 decoration-emerald-500/30 hover:decoration-emerald-400 transition-all py-1 rounded bg-emerald-900/20 border border-emerald-900/30'
    osmBtn.textContent = 'Open in OpenStreetMap'
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
    metaLabel.textContent = 'Detected Metadata'
    card.appendChild(metaLabel)

    const meta = document.createElement('dl')
    meta.className = 'grid grid-cols-2 gap-1 text-[10px]'
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
    empty.className = 'text-slate-500 text-sm text-center py-4'
    empty.textContent = 'No files parsed yet. Drop an image or PDF to begin.'
    container.appendChild(empty)
    return
  }

  const count = document.createElement('p')
  count.className = 'text-xs text-slate-500 mb-2 font-mono'
  count.textContent = `${results.length} file(s) parsed`
  container.appendChild(count)

  const grid = document.createElement('div')
  grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
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

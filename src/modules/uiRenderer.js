// ZeroTrace — UI renderer (T-006)
// Renders metadata cards and color-codes risk levels.
// Uses DOM text nodes exclusively (.textContent) — never innerHTML — to
// neutralize DOM-based XSS from user-controlled EXIF/PDF strings.

/**
 * Clear all content from a results container.
 */
export function clearResults(container) {
  container.textContent = ''
}

/**
 * Render a single metadata card into the given container.
 */
export function renderFileCard(container, result) {
  const card = document.createElement('article')
  card.className =
    'bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-hidden'

  // File header row: name + type badge
  const header = document.createElement('div')
  header.className = 'flex items-center gap-2 mb-3'

  const name = document.createElement('h3')
  name.className = 'text-sm font-semibold text-slate-100 truncate'
  name.textContent = result.file.name
  header.appendChild(name)

  const typeBadge = document.createElement('span')
  typeBadge.className =
    'text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400'
  typeBadge.textContent = result.file.type
  header.appendChild(typeBadge)

  card.appendChild(header)

  // Risk banner (GPS = rose-500 warning, otherwise emerald-500 safe)
  const risk = document.createElement('div')
  risk.className = 'mb-3 px-2 py-1.5 rounded text-xs font-bold border'
  if (result.riskLevel === 'warning') {
    risk.className +=
      ' bg-rose-900/40 text-rose-500 border-rose-500/30'
    risk.textContent = '⚠ GPS location data detected — high risk'
  } else {
    risk.className +=
      ' bg-emerald-900/40 text-emerald-500 border-emerald-500/30'
    risk.textContent = '✓ No GPS location data detected'
  }
  card.appendChild(risk)

  // Error state
  if (result.error) {
    const err = document.createElement('p')
    err.className = 'mt-2 text-xs text-rose-400'
    err.textContent = `Error: ${result.error}`
    card.appendChild(err)
    container.appendChild(card)
    return
  }

  // Metadata definition list
  const fields =
    result.kind === 'image' && result.exif
      ? imageFields(result.exif)
      : result.kind === 'pdf' && result.pdfInfo
      ? pdfFields(result.pdfInfo)
      : []

  if (fields.length === 0) {
    const none = document.createElement('p')
    none.className = 'mt-2 text-xs text-slate-500 italic'
    none.textContent = 'No metadata found.'
    card.appendChild(none)
  } else {
    const meta = document.createElement('dl')
    meta.className = 'grid grid-cols-1 gap-1 text-sm'
    for (const [label, value] of fields) {
      const dt = document.createElement('dt')
      dt.className = 'text-slate-500 text-xs font-medium'
      dt.textContent = label

      const dd = document.createElement('dd')
      dd.className =
        'text-slate-100 font-mono text-xs truncate max-w-[220px]'
      dd.textContent = value ?? '—'

      meta.appendChild(dt)
      meta.appendChild(dd)
    }
    card.appendChild(meta)
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
  push('Orientation', exif.orientation)
  if (exif.latitude != null && exif.longitude != null) {
    push(
      'GPS',
      `${exif.latitude.toFixed(6)}, ${exif.longitude.toFixed(6)}`
    )
  }
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

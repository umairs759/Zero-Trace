import { getRiskTier, THREAT_WEIGHTS } from '../utils/constants.js'

const activeUrls = new Set()

export function revokeAllThumbnails() {
  activeUrls.forEach((url) => URL.revokeObjectURL(url))
  activeUrls.clear()
}

export function renderResults(container, files, onCleanSingle) {
  if (!container) return
  revokeAllThumbnails()
  container.replaceChildren()

  if (!files || files.length === 0) {
    const empty = document.createElement('p')
    empty.setAttribute('class', 'text-zinc-500 text-sm text-center py-12')
    empty.textContent = 'No files parsed yet. Drop an image or PDF to begin.'
    container.appendChild(empty)
    return
  }

  const count = document.createElement('p')
  count.setAttribute('class', 'text-xs text-zinc-500 mb-6 font-mono')
  count.textContent = `${files.length} file(s) staged for sanitization`
  container.appendChild(count)

  const grid = document.createElement('div')
  grid.setAttribute('class', 'space-y-6')

  files.forEach((file, index) => {
    const card = document.createElement('div')
    card.setAttribute('data-card-index', index)
    card.setAttribute('class', 'rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl space-y-6 backdrop-blur-sm')

    // ---------- Top Row: Thumbnail + Name + Size + Threat Badge ----------
    const topRow = document.createElement('div')
    topRow.setAttribute('class', 'flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800')

    const fileMeta = document.createElement('div')
    fileMeta.setAttribute('class', 'flex items-center gap-4')

    if (file.buffer && file.type && file.type.startsWith('image/')) {
      const img = document.createElement('img')
      const blob = new Blob([file.buffer], { type: file.type })
      const url = URL.createObjectURL(blob)
      activeUrls.add(url)
      img.src = url
      img.setAttribute('class', 'w-16 h-16 rounded-xl object-cover border border-zinc-700 bg-zinc-950')
      img.setAttribute('alt', '')
      fileMeta.appendChild(img)
    }

    const titleBox = document.createElement('div')
    const fileName = document.createElement('h3')
    fileName.setAttribute('class', 'text-base font-bold text-zinc-100 max-w-xs truncate')
    fileName.textContent = file.name || 'Unnamed file'

    const fileSize = document.createElement('span')
    fileSize.setAttribute('class', 'text-xs text-zinc-400')
    const sizeKB = file.size ? (file.size / 1024).toFixed(2) : '0'
    fileSize.textContent = `${sizeKB} KB`

    titleBox.appendChild(fileName)
    titleBox.appendChild(fileSize)
    fileMeta.appendChild(titleBox)

    topRow.appendChild(fileMeta)

    // Threat score badge
    const score = file.threatScore || 0
    const tier = getRiskTier(score)
    const threatBadge = document.createElement('div')
    threatBadge.setAttribute('data-threat-badge', 'true')
    threatBadge.setAttribute('class', `px-3 py-1 rounded-full text-xs font-mono font-bold border ${tier.badge}`)
    threatBadge.textContent = file.isSanitized ? 'VERIFIED CLEAN' : `${tier.label} — ${score}/100`
    topRow.appendChild(threatBadge)

    card.appendChild(topRow)

    // ---------- Threat Score Meter ----------
    const scoreRow = document.createElement('div')
    scoreRow.setAttribute('class', 'mt-2 mb-4')

    const scoreLabel = document.createElement('div')
    scoreLabel.setAttribute('class', 'flex items-center justify-between mb-1')
    const scoreText = document.createElement('span')
    scoreText.setAttribute('class', 'text-[10px] font-bold text-zinc-300 uppercase tracking-wider')
    scoreText.textContent = `Threat Score — ${score}/100`
    scoreLabel.appendChild(scoreText)

    const scoreTier = document.createElement('span')
    scoreTier.setAttribute('class', 'text-[10px] font-bold px-2 py-0.5 rounded border text-zinc-300 border-zinc-700')
    scoreTier.textContent = tier.label
    scoreLabel.appendChild(scoreTier)

    scoreRow.appendChild(scoreLabel)

    const progressBar = document.createElement('div')
    progressBar.setAttribute('class', 'w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden')
    const progressFill = document.createElement('div')
    const bgClass = tier.badge.split(' ')[0]
    progressFill.setAttribute('class', `h-full ${bgClass} transition-all duration-500`)
    progressFill.style.width = `${Math.min(score, 100)}%`
    progressBar.appendChild(progressFill)

    scoreRow.appendChild(progressBar)
    card.appendChild(scoreRow)

    // ---------- Before/After Diff Matrix ----------
    const diffGrid = document.createElement('div')
    diffGrid.setAttribute('class', 'grid grid-cols-1 md:grid-cols-2 gap-4')

    // Before column
    const beforeBox = document.createElement('div')
    beforeBox.setAttribute('class', 'p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2')
    const beforeTitle = document.createElement('div')
    beforeTitle.setAttribute('class', 'text-rose-400 font-bold uppercase tracking-wider')
    beforeTitle.textContent = 'BEFORE — INGESTED DATA'
    beforeBox.appendChild(beforeTitle)

    const beforeSha = document.createElement('div')
    beforeSha.setAttribute('class', 'text-zinc-400 truncate text-[10px] font-mono')
    beforeSha.textContent = `SHA-256: ${file.sha256 || 'Pending'}`
    beforeBox.appendChild(beforeSha)

    const beforeTags = document.createElement('div')
    beforeTags.setAttribute('class', 'text-zinc-300 text-[10px] font-mono')
    const tags = file.strippedTags || []
    if (tags.length > 0) {
      beforeTags.textContent = `Detected: ${tags.join(', ')}`
    } else {
      beforeTags.textContent = 'No metadata detected'
    }
    beforeBox.appendChild(beforeTags)

    diffGrid.appendChild(beforeBox)

    // After column
    const afterBox = document.createElement('div')
    afterBox.setAttribute('class', 'p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2')
    const afterTitle = document.createElement('div')
    afterTitle.setAttribute('class', 'text-emerald-400 font-bold uppercase tracking-wider')
    afterTitle.textContent = 'AFTER — SANITIZED STATUS'
    afterBox.appendChild(afterTitle)

    const afterStatus = document.createElement('div')
    afterStatus.setAttribute('data-after-status', 'true')
    if (file.isSanitized) {
      afterStatus.setAttribute('class', 'text-emerald-400 font-bold')
      afterStatus.textContent = 'Status: ✓ All Metadata Stripped'
    } else {
      afterStatus.setAttribute('class', 'text-zinc-500')
      afterStatus.textContent = 'Status: Pending Sanitization'
    }
    afterBox.appendChild(afterStatus)

    const afterSha = document.createElement('div')
    afterSha.setAttribute('data-after-sha', 'true')
    afterSha.setAttribute('class', 'text-zinc-400 truncate text-[10px] font-mono')
    afterSha.textContent = `Clean SHA-256: ${file.sanitizedSha256 || 'Awaiting clean'}`
    afterBox.appendChild(afterSha)

    diffGrid.appendChild(afterBox)
    card.appendChild(diffGrid)

    // ---------- Card Footer ----------
    const cardFooter = document.createElement('div')
    cardFooter.setAttribute('data-card-footer', 'true')
    cardFooter.setAttribute('class', 'mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between')

    if (!file.isSanitized) {
      const cleanSingleBtn = document.createElement('button')
      cleanSingleBtn.setAttribute('class', 'px-4 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors')
      cleanSingleBtn.setAttribute('data-clean-file', String(index))
      cleanSingleBtn.textContent = 'Clean This File'
      cardFooter.appendChild(cleanSingleBtn)
    } else {
      const downloadSingleBtn = document.createElement('button')
      downloadSingleBtn.setAttribute('class', 'px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors shadow-lg')
      downloadSingleBtn.setAttribute('data-download-clean', String(index))
      downloadSingleBtn.textContent = 'Download Sanitized File'
      cardFooter.appendChild(downloadSingleBtn)
    }

    card.appendChild(cardFooter)
    grid.appendChild(card)
  })

  container.appendChild(grid)
}

const activeUrls = new Set()

export function revokeAllThumbnails() {
  activeUrls.forEach(url => URL.revokeObjectURL(url))
  activeUrls.clear()
}

export function renderResults(container, files, onCleanSingle) {
  if (!container) return
  revokeAllThumbnails()
  container.replaceChildren()

  files.forEach((file, index) => {
    const card = document.createElement('div')
    card.setAttribute('class', 'rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl space-y-6')

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

    const threatBadge = document.createElement('div')
    if (file.isSanitized) {
      threatBadge.setAttribute('class', 'px-3 py-1 rounded-full text-xs font-mono font-bold border border-emerald-500/30 bg-emerald-500/20 text-emerald-400')
      threatBadge.textContent = 'VERIFIED CLEAN'
    } else {
      threatBadge.setAttribute('class', 'px-3 py-1 rounded-full text-xs font-mono font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400')
      threatBadge.textContent = 'METADATA DETECTED'
    }

    topRow.appendChild(fileMeta)
    topRow.appendChild(threatBadge)
    card.appendChild(topRow)

    const diffGrid = document.createElement('div')
    diffGrid.setAttribute('class', 'grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono')

    const beforeBox = document.createElement('div')
    beforeBox.setAttribute('class', 'p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2')
    const beforeTitle = document.createElement('div')
    beforeTitle.setAttribute('class', 'text-rose-400 font-bold uppercase tracking-wider')
    beforeTitle.textContent = 'BEFORE — INGESTED DATA'

    const beforeSha = document.createElement('div')
    beforeSha.setAttribute('class', 'text-zinc-400 truncate')
    beforeSha.textContent = `SHA-256: ${file.sha256 || 'Pending'}`

    const tagsInfo = document.createElement('div')
    tagsInfo.setAttribute('class', 'text-zinc-300')
    tagsInfo.textContent = `Detected format: ${file.type || 'Unknown'}`

    beforeBox.appendChild(beforeTitle)
    beforeBox.appendChild(beforeSha)
    beforeBox.appendChild(tagsInfo)

    const afterBox = document.createElement('div')
    afterBox.setAttribute('class', 'p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2')
    const afterTitle = document.createElement('div')
    afterTitle.setAttribute('class', 'text-emerald-400 font-bold uppercase tracking-wider')
    afterTitle.textContent = 'AFTER — SANITIZED STATUS'

    const afterStatus = document.createElement('div')
    afterStatus.setAttribute('class', file.isSanitized ? 'text-emerald-400 font-bold' : 'text-zinc-500')
    afterStatus.textContent = file.isSanitized ? '✓ All Metadata Stripped (Lossless)' : 'Pending Sanitization'

    const afterSha = document.createElement('div')
    afterSha.setAttribute('class', 'text-zinc-400 truncate')
    afterSha.textContent = `Clean SHA-256: ${file.sanitizedSha256 || 'Awaiting clean'}`

    afterBox.appendChild(afterTitle)
    afterBox.appendChild(afterStatus)
    afterBox.appendChild(afterSha)

    diffGrid.appendChild(beforeBox)
    diffGrid.appendChild(afterBox)
    card.appendChild(diffGrid)

    const cardFooter = document.createElement('div')
    cardFooter.setAttribute('class', 'flex items-center justify-between pt-2')

    if (!file.isSanitized) {
      const cleanSingleBtn = document.createElement('button')
      cleanSingleBtn.setAttribute('class', 'px-4 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors')
      cleanSingleBtn.textContent = 'Clean This File'
      cleanSingleBtn.onclick = () => onCleanSingle(index)
      cardFooter.appendChild(cleanSingleBtn)
    } else {
      const downloadSingleBtn = document.createElement('button')
      downloadSingleBtn.setAttribute('class', 'px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors')
      downloadSingleBtn.textContent = 'Download Sanitized File'
      downloadSingleBtn.onclick = () => {
        const b = new Blob([file.sanitizedBuffer], { type: file.type })
        const u = URL.createObjectURL(b)
        const a = document.createElement('a')
        a.href = u
        a.download = `ZeroTrace_Clean_${file.name}`
        a.click()
        setTimeout(() => URL.revokeObjectURL(u), 200)
      }
      cardFooter.appendChild(downloadSingleBtn)
    }

    card.appendChild(cardFooter)
    container.appendChild(card)
  })
}

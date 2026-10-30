import { useCallback, useState } from 'react'

export type ShareStatus =
  'idle' | 'copied' | 'shared' | 'manual' | 'imageCopied' | 'imageDownloaded' | 'imageFailed'

const IMAGE_NAME = 'cruzadinha.png'

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

// Copia o texto; se a área de transferência falhar, tenta o compartilhamento do aparelho; sem ele,
// `manual` pede ao site que mostre o texto para a pessoa copiar (feature 052). A imagem segue a
// mesma ideia: compartilhar o arquivo, copiar a imagem ou baixar o PNG. Nada sai do aparelho.
export function useShareResult() {
  const [status, setStatus] = useState<ShareStatus>('idle')

  const share = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setStatus('copied')
      return
    } catch {
      // segue para o compartilhamento do aparelho
    }
    if (typeof navigator.share !== 'function') {
      setStatus('manual')
      return
    }
    try {
      await navigator.share({ text })
      setStatus('shared')
    } catch (error) {
      setStatus(isAbort(error) ? 'idle' : 'manual')
    }
  }, [])

  const shareImage = useCallback(async (blob: Blob | null) => {
    if (!blob) {
      setStatus('imageFailed')
      return
    }
    const file = new File([blob], IMAGE_NAME, { type: 'image/png' })
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] })
        setStatus('idle')
        return
      } catch (error) {
        if (isAbort(error)) {
          setStatus('idle')
          return
        }
      }
    }
    if (typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function') {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        setStatus('imageCopied')
        return
      } catch {
        // segue para o download
      }
    }
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = IMAGE_NAME
    link.click()
    URL.revokeObjectURL(url)
    setStatus('imageDownloaded')
  }, [])

  const reset = useCallback(() => setStatus('idle'), [])

  return { status, share, shareImage, reset }
}

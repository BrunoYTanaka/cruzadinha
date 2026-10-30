import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useShareResult } from './useShareResult'

function stub(clipboard: unknown, share?: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true })
  Object.defineProperty(navigator, 'share', { value: share, configurable: true })
}

afterEach(() => {
  stub(undefined, undefined)
  vi.unstubAllGlobals()
})

describe('useShareResult', () => {
  it('copia o texto e fica "copied", também numa segunda vez', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stub({ writeText })
    const { result } = renderHook(() => useShareResult())
    await act(() => result.current.share('texto'))
    await act(() => result.current.share('texto'))
    expect(writeText).toHaveBeenCalledTimes(2)
    expect(writeText).toHaveBeenCalledWith('texto')
    expect(result.current.status).toBe('copied')
  })

  it('não faz nenhum pedido de rede', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    stub({ writeText: vi.fn().mockResolvedValue(undefined) })
    const { result } = renderHook(() => useShareResult())
    await act(() => result.current.share('texto'))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('cópia negada com compartilhamento do aparelho: usa o compartilhamento', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    stub({ writeText: vi.fn().mockRejectedValue(new Error('negado')) }, share)
    const { result } = renderHook(() => useShareResult())
    await act(() => result.current.share('texto'))
    expect(share).toHaveBeenCalledWith({ text: 'texto' })
    expect(result.current.status).toBe('shared')
  })

  it('cancelar o compartilhamento volta a "idle" sem erro', async () => {
    const abort = new DOMException('cancelado', 'AbortError')
    stub(
      { writeText: vi.fn().mockRejectedValue(new Error('negado')) },
      vi.fn().mockRejectedValue(abort),
    )
    const { result } = renderHook(() => useShareResult())
    await act(() => result.current.share('texto'))
    expect(result.current.status).toBe('idle')
  })

  it('sem área de transferência nem compartilhamento: "manual"', async () => {
    stub(undefined, undefined)
    const { result } = renderHook(() => useShareResult())
    await act(() => result.current.share('texto'))
    expect(result.current.status).toBe('manual')
  })

  it('compartilhamento que falha por outro motivo: "manual"', async () => {
    stub(
      { writeText: vi.fn().mockRejectedValue(new Error('negado')) },
      vi.fn().mockRejectedValue(new Error('x')),
    )
    const { result } = renderHook(() => useShareResult())
    await act(() => result.current.share('texto'))
    expect(result.current.status).toBe('manual')
  })

  describe('imagem', () => {
    const blob = new Blob(['png'], { type: 'image/png' })
    const original = { createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL }

    afterEach(() => {
      URL.createObjectURL = original.createObjectURL
      URL.revokeObjectURL = original.revokeObjectURL
      Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
    })

    function stubImage(options: { canShare?: boolean; share?: unknown; write?: unknown }) {
      Object.defineProperty(navigator, 'canShare', {
        value: options.canShare === undefined ? undefined : () => options.canShare,
        configurable: true,
      })
      Object.defineProperty(navigator, 'share', { value: options.share, configurable: true })
      Object.defineProperty(navigator, 'clipboard', {
        value: options.write ? { write: options.write } : undefined,
        configurable: true,
      })
      vi.stubGlobal('ClipboardItem', options.write ? class {} : undefined)
    }

    it('compartilha o arquivo quando o aparelho aceita', async () => {
      const share = vi.fn().mockResolvedValue(undefined)
      stubImage({ canShare: true, share })
      const { result } = renderHook(() => useShareResult())
      await act(() => result.current.shareImage(blob))
      const file = share.mock.calls[0]?.[0].files[0] as File
      expect(file.name).toBe('cruzadinha.png')
      expect(result.current.status).toBe('idle')
    })

    it('cancelar o compartilhamento do arquivo não é erro', async () => {
      const share = vi.fn().mockRejectedValue(new DOMException('x', 'AbortError'))
      const write = vi.fn()
      stubImage({ canShare: true, share, write })
      const { result } = renderHook(() => useShareResult())
      await act(() => result.current.shareImage(blob))
      expect(write).not.toHaveBeenCalled()
      expect(result.current.status).toBe('idle')
    })

    it('sem compartilhar arquivo, copia a imagem', async () => {
      const write = vi.fn().mockResolvedValue(undefined)
      stubImage({ write })
      const { result } = renderHook(() => useShareResult())
      await act(() => result.current.shareImage(blob))
      expect(write).toHaveBeenCalledOnce()
      expect(result.current.status).toBe('imageCopied')
    })

    it('sem nenhuma das duas, baixa o PNG', async () => {
      stubImage({})
      URL.createObjectURL = vi.fn(() => 'blob:x')
      URL.revokeObjectURL = vi.fn()
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
      const { result } = renderHook(() => useShareResult())
      await act(() => result.current.shareImage(blob))
      expect(click).toHaveBeenCalledOnce()
      expect(result.current.status).toBe('imageDownloaded')
      click.mockRestore()
    })

    it('sem imagem gerada, "imageFailed"', async () => {
      stubImage({})
      const { result } = renderHook(() => useShareResult())
      await act(() => result.current.shareImage(null))
      expect(result.current.status).toBe('imageFailed')
    })
  })
})

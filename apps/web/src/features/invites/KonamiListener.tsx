import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { ApiRequestError } from '../../api/client'
import { createInvite, listInvites } from '../../api/invites'
import { queryKeys } from '../../api/query-keys'
import { useSessionQuery } from '../auth/useSession'
import { InviteDialog, type InviteResult } from './InviteDialog'
import { createKonamiDetector } from './konami'

function isTextTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

// Ouvinte global da sequência secreta: só com sessão, fora de campos de texto e fora do tabuleiro
// (lá as setas movem a seleção e B e A digitam letras).
export function KonamiListener() {
  const session = useSessionQuery()
  const { pathname } = useLocation()
  const enabled = Boolean(session.data) && !pathname.startsWith('/jogo')
  const [result, setResult] = useState<InviteResult | null>(null)
  const [detector] = useState(createKonamiDetector)
  // Cada abertura tem um número; uma resposta atrasada de uma janela já fechada é descartada.
  const attempt = useRef(0)
  const open = result !== null

  useEffect(() => {
    if (!enabled || open) return
    function onKeyDown(event: KeyboardEvent) {
      if (isTextTarget(event.target)) {
        detector.reset()
        return
      }
      if (!detector.push(event)) return
      const mine = ++attempt.current
      setResult({ kind: 'creating' })
      createInvite().then(
        (created) => {
          if (attempt.current === mine) {
            setResult({ kind: 'created', code: created.code, expiresAt: created.expiresAt })
          }
        },
        (error: unknown) => {
          if (attempt.current !== mine) return
          if (error instanceof ApiRequestError && error.code === 'invite-quota-reached') {
            setResult({ kind: 'quota' })
          } else if (error instanceof ApiRequestError && error.status === 429) {
            setResult({ kind: 'limited', retryAfterSeconds: error.retryAfterSeconds })
          } else if (!(error instanceof ApiRequestError && error.status === 401)) {
            setResult({ kind: 'failed' })
          } else {
            setResult(null)
          }
        },
      )
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [enabled, open, detector])

  const wantsCount = result?.kind === 'created' || result?.kind === 'quota'
  const invites = useQuery({
    queryKey: queryKeys.invites,
    queryFn: listInvites,
    enabled: wantsCount,
    retry: false,
    gcTime: 0,
    staleTime: 0,
  })
  const active = invites.data?.invites.filter((invite) => invite.status === 'active') ?? []
  const oldest = active.map((invite) => invite.expiresAt).sort()[0] ?? null

  function close() {
    attempt.current += 1
    setResult(null)
  }

  if (!enabled && !open) return null
  return (
    <InviteDialog
      result={result}
      activeCount={invites.data ? active.length : null}
      oldestExpiresAt={oldest}
      onClose={close}
    />
  )
}

import type { QueryClient } from '@tanstack/react-query'
import { replace, type LoaderFunctionArgs } from 'react-router'
import { queryKeys } from '../../shared/services/api/query-keys/query-keys'
import { whenServerReady } from '../../shared/services/api/server-wake/server-wake'
import { sessionQueryOptions, toViewer, viewerKey } from '../../features/session'
import {
  isNoPuzzle,
  isSourceDown,
  loadSourceChoice,
  todayCard,
  type TodayCard,
  libraryFor,
} from '../../features/library'
import { getSettings } from '../../shared/services/settings-store/settings-store'
import { todayInBrasilia } from '../../shared/helpers/dates/dates'

// "Ir direto ao jogo" (feature 021, FR-013 e FR-014): ao abrir o endereço raiz, leva à cruzada de
// hoje da cruzada padrão, ou fica no calendário com o motivo.

export type DirectPlayDecision =
  | { kind: 'go'; href: string }
  | { kind: 'stay'; reason: 'completed' | 'no-puzzle' | 'source-down'; name: string }

export type DirectPlayStay = Extract<DirectPlayDecision, { kind: 'stay' }>

// O que a rota `/` devolve quando fica no calendário; a `LibraryPage` mostra o aviso.
export type DirectPlayData = { directPlay: DirectPlayStay }

export function isDirectPlayData(value: unknown): value is DirectPlayData {
  return typeof value === 'object' && value !== null && 'directPlay' in value
}

export function decideDirectPlay(card: TodayCard): DirectPlayDecision {
  switch (card.kind) {
    case 'not_started':
    case 'in_progress':
      return card.href ? { kind: 'go', href: card.href } : stay('no-puzzle', card)
    case 'fetchable':
      // Sem `href` o cartão já sabe que a fonte está fora do ar (feature 015).
      return card.href ? { kind: 'go', href: card.href } : stay('source-down', card)
    case 'completed':
      return stay('completed', card)
    case 'none':
    case 'future':
      return stay('no-puzzle', card)
  }
}

function stay(reason: DirectPlayStay['reason'], card: TodayCard): DirectPlayStay {
  return { kind: 'stay', reason, name: card.name }
}

export function directPlayMessage({ reason, name }: DirectPlayStay): string {
  switch (reason) {
    case 'completed':
      return `${name}: a cruzada de hoje já foi concluída.`
    case 'no-puzzle':
      return `${name} não publicou cruzada hoje.`
    case 'source-down':
      return `${name} está fora do ar agora.`
  }
}

// Caminho com que a página abriu: o atalho só vale se foi o endereço raiz, nunca um link direto.
const pageInitialPath = typeof window === 'undefined' ? '' : window.location.pathname

type DirectPlayOptions = { initialPath?: string; today?: () => string }

// Loader da rota `/`. Age uma vez por carregamento da página (voltar ao calendário pelo cabeçalho
// não leva de novo ao jogo) e usa `replace`, para o Voltar do navegador não repetir o atalho.
export function directPlayLoader(
  queryClient: QueryClient,
  { initialPath = pageInitialPath, today = todayInBrasilia }: DirectPlayOptions = {},
) {
  let handled = false
  return async (
    args?: Pick<LoaderFunctionArgs, 'request'>,
  ): Promise<Response | DirectPlayData | null> => {
    if (handled) return null
    handled = true
    if (initialPath !== '/' || !getSettings().directToGame) return null
    const source = loadSourceChoice()
    try {
      // Roda em paralelo com o loader pai que espera a API acordar (feature 032).
      await whenServerReady(args?.request.signal)
      const viewer = toViewer(await queryClient.ensureQueryData(sessionQueryOptions()))
      const library = await queryClient.ensureQueryData({
        queryKey: queryKeys.library(viewerKey(viewer), source),
        queryFn: () => libraryFor(viewer, source),
      })
      const day = today()
      const card = todayCard(
        source,
        library.items.filter((item) => item.source === source),
        day,
        { down: isSourceDown(source), noPuzzle: isNoPuzzle(source, day) },
      )
      const decision = decideDirectPlay(card)
      return decision.kind === 'go' ? replace(decision.href) : { directPlay: decision }
    } catch {
      // Sem a biblioteca, o calendário abre normalmente e mostra os próprios erros.
      return null
    }
  }
}

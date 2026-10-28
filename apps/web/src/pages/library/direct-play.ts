import type { QueryClient } from '@tanstack/react-query'
import { replace, type LoaderFunctionArgs } from 'react-router'
import { queryKeys } from '../../shared/services/api/query-keys/query-keys'
import { waitForServer } from '../../shared/services/api/server-wake/server-wake'
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

// "Ir direto ao jogo" (feature 021, FR-013; feature 048, FR-002): ao chegar no endereço raiz, leva à
// cruzada de hoje da cruzada padrão, ou vai ao calendário com o motivo.

export type DirectPlayDecision =
  | { kind: 'go'; href: string }
  | { kind: 'stay'; reason: 'completed' | 'no-puzzle' | 'source-down'; name: string }

export type DirectPlayStay = Extract<DirectPlayDecision, { kind: 'stay' }>

// O motivo de ter ido ao calendário atravessa o redirecionamento numa variável do módulo (como a
// escolha de fonte): a `LibraryPage` o lê com `peekDirectPlayStay` ao montar e o apaga com
// `clearDirectPlayStay`, então o aviso não volta numa visita posterior ao calendário.
let pendingStay: DirectPlayStay | null = null

export function rememberDirectPlayStay(stay: DirectPlayStay): void {
  pendingStay = stay
}

export function peekDirectPlayStay(): DirectPlayStay | null {
  return pendingStay
}

export function clearDirectPlayStay(): void {
  pendingStay = null
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

type DirectPlayOptions = { today?: () => string }

// Loader da rota `/`. Decide a cada chegada em `/` (endereço ou logo do cabeçalho) e usa `replace`,
// para o Voltar do navegador não repetir o atalho.
export function directPlayLoader(
  queryClient: QueryClient,
  { today = todayInBrasilia }: DirectPlayOptions = {},
) {
  return async (args?: Pick<LoaderFunctionArgs, 'request'>): Promise<Response | null> => {
    pendingStay = null
    if (!getSettings().directToGame) return null
    const source = loadSourceChoice()
    try {
      // A landing fica fora do grupo cujo loader espera a API acordar, então este loader acorda e
      // espera o servidor ele mesmo (features 032 e 048).
      await waitForServer({ signal: args?.request.signal })
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
      if (decision.kind === 'go') return replace(decision.href)
      rememberDirectPlayStay(decision)
      return replace('/calendario')
    } catch {
      // Sem a biblioteca, o calendário abre normalmente e mostra os próprios erros.
      return replace('/calendario')
    }
  }
}

import type { QueryClient } from '@tanstack/react-query'
import { replace, type LoaderFunctionArgs } from 'react-router'
import { defaultSourceFor } from '../../features/library'
import { todayInBrasilia } from '../../shared/helpers/dates/dates'
import { waitForServer } from '../../shared/services/api/server-wake/server-wake'
import { fetchVisibleSources } from '../../shared/services/api/visible-sources/visible-sources'

// "Jogar a cruzada de hoje" da landing (feature 048): endereço estável (a data de hoje não pode ficar
// escrita no HTML pré-gerado) que leva ao dia de hoje da cruzada padrão, como o cartão de "Hoje".
// A cruzada padrão guardada que a administração escondeu vale como a primeira visível (feature 060).
export function playTodayLoader(
  queryClient: QueryClient,
  { today = todayInBrasilia }: { today?: () => string } = {},
) {
  return async (args?: Pick<LoaderFunctionArgs, 'request'>) => {
    // Os loaders da rota rodam juntos: acorda o servidor antes de pedir a lista de fontes.
    await waitForServer({ signal: args?.request.signal })
    const source = defaultSourceFor(await fetchVisibleSources(queryClient))
    return replace(`/dia/${today()}?fonte=${source}`)
  }
}

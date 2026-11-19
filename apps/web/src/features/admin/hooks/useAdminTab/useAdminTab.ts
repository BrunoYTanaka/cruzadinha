import type { GeneratedSourceId } from '@cruzadinha/shared'
import { useSearchParams } from 'react-router'

export type AdminTabId = 'fontes' | GeneratedSourceId

// `?aba=` vale só para uma aba que existe; o resto abre "Fontes" (feature 066, FR-006).
export function resolveAdminTab(
  param: string | null,
  generatedIds: readonly GeneratedSourceId[],
): AdminTabId {
  return generatedIds.find((id) => id === param) ?? 'fontes'
}

// A aba escolhida mora no endereço. Trocar substitui a entrada do histórico: Voltar sai da
// administração em vez de passear entre abas. Um valor desconhecido não é reescrito.
export function useAdminTab(
  generatedIds: readonly GeneratedSourceId[],
): [AdminTabId, (id: AdminTabId) => void] {
  const [params, setParams] = useSearchParams()
  const tab = resolveAdminTab(params.get('aba'), generatedIds)
  const setTab = (id: AdminTabId) =>
    setParams(
      (previous) => {
        previous.set('aba', id)
        return previous
      },
      { replace: true },
    )
  return [tab, setTab]
}

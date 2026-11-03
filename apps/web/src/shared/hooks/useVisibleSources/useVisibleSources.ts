import type { PuzzleSourceId } from '@cruzadinha/shared'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  ALL_SOURCES,
  visibleSourcesQuery,
} from '../../services/api/visible-sources/visible-sources'

export type VisibleSources = {
  // Enquanto carrega não há lista: quem desenha abas ou pede dados por fonte espera (feature 060).
  isPending: boolean
  sources: readonly PuzzleSourceId[]
  defaultSource: PuzzleSourceId
}

// `enabled: false` não pede nada: quem fica montado o tempo todo (a janela de configurações) só
// consulta com ela aberta, para a landing e a espera do servidor não fazerem pedido algum.
export function useVisibleSources({ enabled = true }: { enabled?: boolean } = {}): VisibleSources {
  const query = useQuery({ ...visibleSourcesQuery, enabled })
  // Só a primeira resposta (ou erro) conta como espera: uma nova busca em segundo plano não pode
  // devolver a tela ao carregamento.
  const [settled, setSettled] = useState(false)
  if (!query.isPending && !settled) setSettled(true)
  // Sem lista (erro ou 404 de uma API anterior): todas as fontes, sem erro para o site. Uma lista
  // já recebida vale até a próxima resposta, mesmo se a busca seguinte falhar.
  const sources = query.data ?? ALL_SOURCES
  const [first] = sources
  return {
    isPending: !settled && query.isPending,
    sources,
    defaultSource: first ?? ALL_SOURCES[0] ?? 'oglobo',
  }
}

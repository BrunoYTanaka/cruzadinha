import { puzzleSourceIdSchema, type PuzzleSourceId } from '@cruzadinha/shared'
import { useState } from 'react'
import { getSettings, updateSettings } from '../../shared/services/settings-store'

// A primeira fonte da lista é a padrão; uma fonte guardada que saiu da lista volta a ela (feature 015).
export const DEFAULT_SOURCE: PuzzleSourceId = firstSource()

function firstSource(): PuzzleSourceId {
  const [first] = puzzleSourceIdSchema.options
  if (first === undefined) throw new Error('a lista de fontes está vazia')
  return first
}

// Cruzada padrão das configurações (feature 021). Uma fonte que este site não conhece (API mais nova
// ou fonte retirada) vale como a primeira, sem regravar o valor guardado (FR-012b).
export function loadSourceChoice(): PuzzleSourceId {
  const parsed = puzzleSourceIdSchema.safeParse(getSettings().defaultSource)
  return parsed.success ? parsed.data : DEFAULT_SOURCE
}

export function saveSourceChoice(source: PuzzleSourceId): void {
  updateSettings({ defaultSource: source })
}

// Fonte do último jogo aberto (feature 031). Fica na memória do módulo, não na URL nem no aparelho:
// vale para qualquer caminho de volta, inclusive o botão do navegador, e zera ao recarregar a página.
let rememberedSource: PuzzleSourceId | null = null

export function rememberGameSource(source: unknown): void {
  const parsed = puzzleSourceIdSchema.safeParse(source)
  rememberedSource = parsed.success ? parsed.data : null
}

export function clearRememberedSource(): void {
  rememberedSource = null
}

// Aba do calendário: começa na fonte do jogo de onde a pessoa voltou, senão na cruzada padrão, e
// muda só durante a visita, sem virar preferência.
export function useSourceChoice(): [PuzzleSourceId, (source: PuzzleSourceId) => void] {
  return useState(() => rememberedSource ?? loadSourceChoice())
}

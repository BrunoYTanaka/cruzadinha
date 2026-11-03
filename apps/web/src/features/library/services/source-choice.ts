import { puzzleSourceIdSchema, type PuzzleSourceId } from '@cruzadinha/shared'
import { useState } from 'react'
import { useVisibleSources } from '../../../shared/hooks/useVisibleSources/useVisibleSources'
import { readStorage, writeStorage } from '../../../shared/services/storage/storage'
import { getSettings, updateSettings } from '../../../shared/services/settings-store/settings-store'

// A primeira fonte da lista é a padrão; uma fonte guardada que saiu da lista volta a ela (feature 015).
export const DEFAULT_SOURCE: PuzzleSourceId = firstSource()

function firstSource(): PuzzleSourceId {
  const [first] = puzzleSourceIdSchema.options
  if (first === undefined) throw new Error('a lista de fontes está vazia')
  return first
}

// Única regra de "fonte que sumiu" (feature 060): uma escolha ausente da lista visível (escondida pela
// administração ou desconhecida) vale como a primeira visível. Não apaga nem regrava a escolha
// guardada, que volta a valer quando a fonte reaparece.
export function resolveSource(
  choice: PuzzleSourceId,
  visible: readonly PuzzleSourceId[],
): PuzzleSourceId {
  if (visible.includes(choice)) return choice
  return visible[0] ?? choice
}

// Cruzada padrão das configurações (feature 021). Uma fonte que este site não conhece (API mais nova
// ou fonte retirada) vale como a primeira, sem regravar o valor guardado (FR-012b).
export function loadSourceChoice(): PuzzleSourceId {
  const parsed = puzzleSourceIdSchema.safeParse(getSettings().defaultSource)
  return parsed.success ? parsed.data : DEFAULT_SOURCE
}

// A pessoa escolheu a cruzada padrão? As configurações guardam sempre um valor (o padrão do código
// quando ela nunca mexeu), então um marcador deste aparelho separa "escolheu O Globo" de "nunca
// escolheu" (feature 060): quem nunca escolheu segue a ordem da administração. Um valor diferente
// do padrão do código (por exemplo, vindo da conta) também conta como escolha.
const CHOSEN_KEY = 'cruzadinha:source-chosen'

function hasChosenSource(): boolean {
  return readStorage(CHOSEN_KEY) === '1' || loadSourceChoice() !== DEFAULT_SOURCE
}

export function saveSourceChoice(source: PuzzleSourceId): void {
  writeStorage(CHOSEN_KEY, '1')
  updateSettings({ defaultSource: source })
}

// Fonte aberta por padrão (FR-006): a escolha da pessoa, se ela ainda estiver visível; sem escolha,
// ou com a escolhida escondida, a primeira visível da ordem. Não regrava nada.
export function defaultSourceFor(visible: readonly PuzzleSourceId[]): PuzzleSourceId {
  return hasChosenSource()
    ? resolveSource(loadSourceChoice(), visible)
    : (visible[0] ?? DEFAULT_SOURCE)
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
  const { sources } = useVisibleSources()
  // O jogo lembrado é lido uma vez, na montagem (a página o apaga logo depois).
  const [remembered] = useState(() => rememberedSource)
  // `null`: a pessoa ainda não escolheu uma aba nesta visita; vale o jogo lembrado ou o padrão.
  const [choice, setChoice] = useState<PuzzleSourceId | null>(null)
  return [resolveSource(choice ?? remembered ?? defaultSourceFor(sources), sources), setChoice]
}

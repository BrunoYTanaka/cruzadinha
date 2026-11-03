import { puzzleSourceIdSchema, type PuzzleSourceId } from '@cruzadinha/shared'

export type SourceSetting = { id: PuzzleSourceId; visible: boolean; position: number }
export type SourceRequestItem = { id: PuzzleSourceId; visible: boolean }

export type SourcesDecision =
  | { kind: 'invalid' }
  | { kind: 'no-visible-source' }
  | { kind: 'unchanged' }
  | { kind: 'save'; rows: SourceSetting[] }

// Regra pura do salvamento (feature 060): cada fonte conhecida uma vez, a ordem do vetor vira
// `position`, ao menos uma visível, e igual ao estado atual não grava nada.
export function decideSources(
  current: readonly SourceSetting[],
  request: readonly SourceRequestItem[],
): SourcesDecision {
  const ids = request.map((item) => item.id)
  const complete =
    ids.length === puzzleSourceIdSchema.options.length &&
    puzzleSourceIdSchema.options.every((id) => ids.includes(id))
  if (!complete) return { kind: 'invalid' }
  if (!request.some((item) => item.visible)) return { kind: 'no-visible-source' }
  const rows = request.map((item, position) => ({ id: item.id, visible: item.visible, position }))
  const same =
    current.length === rows.length &&
    rows.every((row) => {
      const now = current.find((item) => item.id === row.id)
      return now?.visible === row.visible && now.position === row.position
    })
  return same ? { kind: 'unchanged' } : { kind: 'save', rows }
}

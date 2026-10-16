import { z } from 'zod'
import type { RuleIssue } from '../puzzle/rules'
import type { Puzzle } from '../puzzle/schema'

// Sete dias em milissegundos: cobre quem deixa a aba aberta e cabe em um inteiro de 32 bits.
export const MAX_ELAPSED_MS = 604_800_000

export const progressStatusSchema = z.enum(['in_progress', 'completed'])

// Letras do jogador no formato da solução: matriz altura x largura, `null` em bloco ou célula vazia.
export const progressCellsSchema = z.array(z.array(z.string().nullable()))

const elapsedMsSchema = z.number().int().min(0).max(MAX_ELAPSED_MS)
const instantSchema = z.iso.datetime({ offset: true })

export const saveProgressRequestSchema = z.strictObject({
  cells: progressCellsSchema,
  elapsedMs: elapsedMsSchema,
  status: progressStatusSchema,
  savedAt: instantSchema,
})

// Resposta: descarta campos desconhecidos para o site anterior aceitar versões novas da API (FR-025).
export const progressSchema = z.object({
  puzzleId: z.uuid(),
  cells: progressCellsSchema,
  elapsedMs: elapsedMsSchema,
  status: progressStatusSchema,
  savedAt: instantSchema,
  completedAt: instantSchema.nullable(),
  finishedMs: elapsedMsSchema.nullable(),
  bestMs: elapsedMsSchema.nullable(),
  bestAt: instantSchema.nullable(),
  updatedAt: instantSchema,
})

export const progressEnvelopeSchema = z.object({ progress: progressSchema.nullable() })

export type ProgressStatus = z.infer<typeof progressStatusSchema>
export type ProgressCells = z.infer<typeof progressCellsSchema>
export type SaveProgressRequest = z.infer<typeof saveProgressRequestSchema>
export type Progress = z.infer<typeof progressSchema>
export type ProgressEnvelope = z.infer<typeof progressEnvelopeSchema>

export type CellsValidation = { success: true } | { success: false; issues: RuleIssue[] }

// Confere as letras do jogador contra a grade. As mensagens nunca repetem o conteúdo das letras.
export function cellsMatchGrid(grid: Puzzle['grid'], cells: ProgressCells): CellsValidation {
  const sameShape = cells.length === grid.height && cells.every((row) => row.length === grid.width)
  if (!sameShape) {
    return {
      success: false,
      issues: [{ path: ['cells'], message: 'as letras devem ter as dimensões da grade' }],
    }
  }

  const issues: RuleIssue[] = []
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      const letter = cells[r]?.[c]
      const path = ['cells', r, c]
      if (letter === null || letter === undefined) return
      if (cell.kind === 'block') {
        issues.push({ path, message: 'bloco não pode ter letra' })
      } else if (
        Array.from(letter).length !== 1 ||
        !/^\p{L}$/u.test(letter) ||
        letter !== letter.toLocaleUpperCase('pt-BR')
      ) {
        issues.push({ path, message: 'a célula deve ter uma única letra maiúscula' })
      }
    }),
  )

  return issues.length === 0 ? { success: true } : { success: false, issues }
}

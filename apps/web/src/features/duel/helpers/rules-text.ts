import { formatElapsed } from '../../../shared/helpers/time/time'

type Rules = {
  helpMode: 'free' | 'forbidden' | 'penalty'
  helpPenaltyMs: number | null
  maxMs: number | null
  startDeadlineAt: string
}

// Textos das regras do duelo, os mesmos na janela antes de começar e no resultado (feature 058).
export function helpText(rules: Pick<Rules, 'helpMode' | 'helpPenaltyMs'>): string {
  if (rules.helpMode === 'forbidden')
    return 'Sem ajudas: letra, palavra e verificar ficam desligados.'
  if (rules.helpMode === 'penalty') {
    const seconds = Math.round((rules.helpPenaltyMs ?? 0) / 1000)
    return `Cada ajuda de letra ou palavra soma ${seconds} s ao seu tempo. Verificar fica desligado.`
  }
  return 'Ajudas livres, sem penalidade.'
}

export function maxTimeText(maxMs: number | null): string {
  return maxMs === null
    ? 'Sem tempo máximo.'
    : `Tempo máximo de ${Math.round(maxMs / 60_000)} min depois de começar; passou disso, perde.`
}

export function deadlineText(startDeadlineAt: string): string {
  const when = new Date(startDeadlineAt).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  })
  return `Prazo para começar: até ${when} (horário de Brasília).`
}

export const clockText =
  'O relógio é do servidor: começa no "Começar", não pausa e não reinicia ao recarregar.'

export const timeText = (ms: number | null): string => (ms === null ? '—' : formatElapsed(ms))

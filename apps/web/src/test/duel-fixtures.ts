import type { DuelView } from '@cruzadinha/shared'

export const LINK = 'l'.repeat(43)
export const DUEL_ID = '3b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'

const side = { endReason: 'completed', elapsedMs: 300_000, penaltyMs: 0, helpsUsed: 0 } as const

// Duelo como a API o devolve para quem participa; os testes mudam só o que importa.
export function makeDuelView(overrides: Partial<DuelView> = {}): DuelView {
  return {
    duelId: DUEL_ID,
    linkToken: LINK,
    role: 'creator',
    status: 'open',
    myStatus: 'not-started',
    opponentStatus: 'not-joined',
    source: 'oglobo',
    puzzleDate: '2026-10-14',
    rules: {
      helpMode: 'free',
      helpPenaltyMs: null,
      maxMs: null,
      startDeadlineAt: '2026-10-15T15:00:00.000Z',
    },
    me: { nickname: 'Ana', startedAt: null },
    opponentNickname: null,
    result: null,
    ...overrides,
  }
}

export const NOW = '2026-10-14T15:00:00.000Z'

export const finishedResult = (verdict: 'won' | 'lost' | 'tie' = 'won'): DuelView['result'] => ({
  verdict,
  reason: 'time',
  diffMs: 12_000,
  me: { nickname: 'Ana', ...side },
  opponent: { nickname: 'Beto', ...side, elapsedMs: 312_000 },
})

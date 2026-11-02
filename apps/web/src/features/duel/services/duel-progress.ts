import type { DuelView } from '@cruzadinha/shared'
import type { SaveQueue, SaveState } from '../../../domain/game/save-types'
import { ApiRequestError } from '../../../shared/services/api/client/client'
import { clearDraft } from '../../offline'
import {
  createGuestSaveQueue,
  createGuestStore,
  type GuestSaveQueueOptions,
  type GuestStore,
} from '../../guest'

// Progresso do jogo de cada duelo (feature 058): um banco só do duelo, com a chave sendo o id do
// duelo, nunca o da cruzada. Assim dois duelos da mesma cruzada, o jogo normal e o "Jogar de novo"
// nunca se misturam (FR-016).
export const DUEL_GAME_DB = 'cruzadinha-duelo-jogo'
export const duelGameStore: GuestStore = createGuestStore({ dbName: DUEL_GAME_DB })

export const FINISH_BACKOFF_MS = [1000, 2000, 4000, 8000, 15000]

type FinishDeps = {
  // Envia a conclusão ao servidor, com as ajudas declaradas.
  finish: (helpsUsed: number) => Promise<DuelView>
  // O servidor respondeu (com o duelo) ou recusou de vez (`null`): a tela busca o estado de novo.
  onFinished: (view: DuelView | null) => void
  // Avisa quando está esperando para tentar de novo (sem rede ou servidor ocupado).
  onWaiting?: (waiting: boolean) => void
  sleep?: (ms: number) => Promise<void>
  isStopped?: () => boolean
}

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// Terminar o duelo é sempre re-tentado enquanto o problema for de rede ou do servidor: o jogador não
// perde o que digitou e o tempo continua sendo o do servidor (FR-019). Erro 4xx (exceto 429) encerra.
export async function finishWithRetry(helpsUsed: number, deps: FinishDeps): Promise<void> {
  const sleep = deps.sleep ?? pause
  for (let attempt = 0; !deps.isStopped?.(); attempt += 1) {
    try {
      const view = await deps.finish(helpsUsed)
      deps.onWaiting?.(false)
      deps.onFinished(view)
      return
    } catch (error) {
      const final =
        error instanceof ApiRequestError &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 429
      if (final) {
        deps.onWaiting?.(false)
        deps.onFinished(null)
        return
      }
      deps.onWaiting?.(true)
      await sleep(FINISH_BACKOFF_MS[Math.min(attempt, FINISH_BACKOFF_MS.length - 1)] ?? 15000)
    }
  }
}

// Ajudas declaradas no registro do jogo: letras e palavras reveladas.
export const helpsOf = (help: { usage: { letters: number; words: number } } | null | undefined) =>
  (help?.usage.letters ?? 0) + (help?.usage.words ?? 0)

// Fila de salvamento do duelo: grava no aparelho a cada chamada e, na conclusão, termina o duelo no
// servidor.
export function duelQueueFactory(deps: { duelId: string } & FinishDeps) {
  return (options: GuestSaveQueueOptions): SaveQueue => {
    const inner = createGuestSaveQueue({ ...options, puzzleId: deps.duelId })
    const listeners = new Set<() => void>()
    let waiting = false
    let stopped = false

    const setWaiting = (value: boolean) => {
      if (waiting === value) return
      waiting = value
      listeners.forEach((listener) => listener())
    }

    return {
      getState: (): SaveState => (waiting ? 'offline' : inner.getState()),
      subscribe: (listener) => {
        listeners.add(listener)
        const off = inner.subscribe(listener)
        return () => {
          listeners.delete(listener)
          off()
        }
      },
      schedule: inner.schedule,
      sendNow: async (snapshot, sendOptions) => {
        // A conclusão fica no aparelho primeiro; o envio ao servidor segue até dar certo.
        await inner.sendNow(snapshot, sendOptions)
        if (snapshot.status === 'completed') {
          const help = (snapshot as { help?: Parameters<typeof helpsOf>[0] }).help
          void finishWithRetry(helpsOf(help), {
            ...deps,
            onWaiting: setWaiting,
            isStopped: () => stopped,
          })
        }
      },
      retry: async () => {},
      readOutbox: () => null,
      dispose: () => {
        stopped = true
        inner.dispose()
      },
    }
  }
}

// Apaga o jogo do duelo e o rascunho, quando o duelo termina para esta pessoa.
export async function clearDuelProgress(duelId: string, puzzleId: string): Promise<void> {
  const record = await duelGameStore.get(duelId)
  if (record) await duelGameStore.removeIfUnchanged(duelId, record.savedAt)
  clearDraft(`duel-${duelId}`, puzzleId)
}

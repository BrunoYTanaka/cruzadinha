import type { Executor } from '../db/client'
import type { EmailConfig } from '../../config'
import type { Clock } from '../lib/clock'

import type { RateLimiter } from '../rate-limit'
import { blockedUntilFor } from './quota'
import { findActiveBlock, upsertBlock } from './send-block.repository'
import type { EmailKind, EmailMessage, EmailSender } from './types'

type MailLog = { warn(obj: object, msg: string): void }

export type Admission = { ok: true } | { ok: false; retryAfterSeconds: number }

export type EmailService = {
  // Antes do trabalho da rota: o envio está ligado e sem trava de cota? (sem chamar o provedor)
  admit(): Promise<Admission>
  // Envia depois de a rota responder: confere os tetos, chama o provedor, grava a trava de cota.
  // `onNotSent` roda quando nenhum e-mail saiu (teto, trava ou falha), para a pessoa não esperar
  // o intervalo por um e-mail que nunca chegou.
  sendAfterResponse(kind: EmailKind, message: EmailMessage, onNotSent?: () => Promise<void>): void
  // Aguarda os envios em andamento (testes e desligamento).
  flush(): Promise<void>
  readonly intervalSeconds: number
}

export type EmailDeps = {
  db: Executor
  clock: Clock
  sender: EmailSender | undefined
  rateLimiter: RateLimiter
  config: EmailConfig
  logger: MailLog
}

const DAY_MINUTES = 24 * 60
// Sem remetente configurado a pessoa só precisa saber que é para tentar mais tarde.
const UNCONFIGURED_RETRY_SECONDS = 300

export function createEmailService({
  db,
  clock,
  sender,
  rateLimiter,
  config,
  logger,
}: EmailDeps): EmailService {
  const pending = new Set<Promise<void>>()

  async function deliver(
    kind: EmailKind,
    message: EmailMessage,
    onNotSent: (() => Promise<void>) | undefined,
  ): Promise<void> {
    if (!sender) return
    const now = clock()
    if (await findActiveBlock(db, now)) {
      await onNotSent?.()
      return
    }

    const globalKey = { action: 'EMAIL_SENT', keyType: 'GLOBAL', keyValue: 'email' } as const
    const emailKey = { action: 'EMAIL_SENT', keyType: 'EMAIL', keyValue: message.to } as const
    const globalMax =
      kind === 'recovery' ? config.dailyCeiling : config.dailyCeiling - config.recoveryReserve
    const decision = await rateLimiter.check(
      [
        { key: globalKey, window: { max: globalMax, windowMinutes: DAY_MINUTES } },
        { key: emailKey, window: { max: config.perAddressDailyMax, windowMinutes: DAY_MINUTES } },
      ],
      now,
    )
    // Teto atingido: a rota já respondeu igual, então só deixa de enviar.
    if (!decision.allowed) {
      await onNotSent?.()
      return
    }

    const result = await sender.send(message)
    if (result.ok) {
      await rateLimiter.record([globalKey, emailKey], clock())
      return
    }
    if (result.reason === 'quota-daily' || result.reason === 'quota-monthly') {
      const reason =
        result.reason === 'quota-daily' ? 'daily_quota_exceeded' : 'monthly_quota_exceeded'
      await upsertBlock(db, { blockedUntil: blockedUntilFor(reason, clock()), reason })
    }
    await onNotSent?.()
    // Sem endereço, assunto nem token no log.
    logger.warn({ reason: result.reason, kind }, 'e-mail não enviado')
  }

  return {
    intervalSeconds: config.resendIntervalSeconds,

    async admit() {
      if (!sender) return { ok: false, retryAfterSeconds: UNCONFIGURED_RETRY_SECONDS }
      const now = clock()
      const until = await findActiveBlock(db, now)
      if (!until) return { ok: true }
      return {
        ok: false,
        retryAfterSeconds: Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 1000)),
      }
    },

    sendAfterResponse(kind, message, onNotSent) {
      const task: Promise<void> = deliver(kind, message, onNotSent)
        .catch((error: unknown) => {
          // Só o nome: a mensagem de erro do banco ou da rede pode trazer endereço ou parâmetros.
          logger.warn(
            { err: error instanceof Error ? error.name : 'erro' },
            'falha ao enviar e-mail',
          )
        })
        .finally(() => {
          pending.delete(task)
        })
      pending.add(task)
    },

    async flush() {
      while (pending.size > 0) await Promise.all([...pending])
    },
  }
}

import { eq, gt, and, sql } from 'drizzle-orm'
import type { Executor } from '../db/client'
import { emailSendBlock } from '../db/schema'
import type { QuotaReason } from './quota'

const BLOCK_ID = 1

// Devolve até quando o envio está bloqueado, ou undefined quando não há trava ativa.
export async function findActiveBlock(db: Executor, now: Date): Promise<Date | undefined> {
  const [row] = await db
    .select({ blockedUntil: emailSendBlock.blockedUntil })
    .from(emailSendBlock)
    .where(and(eq(emailSendBlock.blockId, BLOCK_ID), gt(emailSendBlock.blockedUntil, now)))
  return row?.blockedUntil
}

// Uma trava nunca encurta outra: vale o maior `blocked_until`.
export async function upsertBlock(
  db: Executor,
  values: { blockedUntil: Date; reason: QuotaReason },
): Promise<void> {
  await db
    .insert(emailSendBlock)
    .values({ blockId: BLOCK_ID, ...values })
    .onConflictDoUpdate({
      target: emailSendBlock.blockId,
      set: {
        blockedUntil: sql`GREATEST(${emailSendBlock.blockedUntil}, excluded.blocked_until)`,
        reason: sql`CASE WHEN excluded.blocked_until >= ${emailSendBlock.blockedUntil} THEN excluded.reason ELSE ${emailSendBlock.reason} END`,
      },
    })
}

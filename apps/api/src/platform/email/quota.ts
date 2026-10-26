export type QuotaReason = 'daily_quota_exceeded' | 'monthly_quota_exceeded'

// A cota diária do Resend zera à meia-noite UTC; para a mensal a documentação não dá o instante,
// então vale o início do mês UTC seguinte (se for cedo demais, o envio seguinte trava de novo).
export function blockedUntilFor(reason: QuotaReason, now: Date): Date {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  return reason === 'daily_quota_exceeded'
    ? new Date(Date.UTC(year, month, now.getUTCDate() + 1))
    : new Date(Date.UTC(year, month + 1, 1))
}

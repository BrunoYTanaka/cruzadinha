export type EmailMessage = {
  to: string
  subject: string
  text: string
  html: string
  // Repetir o mesmo envio (por exemplo, uma nova tentativa de rede) não manda dois e-mails.
  idempotencyKey: string
}

export type SendResult =
  { ok: true } | { ok: false; reason: 'quota-daily' | 'quota-monthly' | 'rate-limited' | 'failed' }

export interface EmailSender {
  send(message: EmailMessage): Promise<SendResult>
}

// `signup` (confirmação e aviso) respeita a reserva; `recovery` pode usar as últimas vagas.
export type EmailKind = 'signup' | 'recovery'

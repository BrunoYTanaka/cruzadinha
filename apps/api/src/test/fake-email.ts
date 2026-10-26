import type { EmailMessage, EmailSender, SendResult } from '../platform/email/types'

export type FakeEmailSender = EmailSender & {
  sent: EmailMessage[]
  /** Resultados entregues na ordem; depois deles, todo envio dá certo. */
  outcomes: SendResult[]
  /** Tempo de cada envio, para provar que a resposta da API não o espera. */
  delayMs: number
}

export function fakeEmailSender(): FakeEmailSender {
  const sender: FakeEmailSender = {
    sent: [],
    outcomes: [],
    delayMs: 0,
    async send(message) {
      if (sender.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, sender.delayMs))
      sender.sent.push(message)
      return sender.outcomes.shift() ?? { ok: true }
    },
  }
  return sender
}

// O token vai no fragmento do link do e-mail.
export function tokenFrom(message: EmailMessage | undefined): string {
  const match = /#token=([A-Za-z0-9_-]{43})/.exec(message?.text ?? '')
  if (!match?.[1]) throw new Error('e-mail sem link com token')
  return match[1]
}

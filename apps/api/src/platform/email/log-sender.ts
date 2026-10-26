import type { EmailSender } from './types'

type Log = { info(obj: object, msg: string): void }

// Só o desenvolvimento: escreve o e-mail no log em vez de enviá-lo, para o link poder ser aberto.
export function createLogSender(log: Log): EmailSender {
  return {
    async send(message) {
      log.info({ to: message.to, subject: message.subject, text: message.text }, 'e-mail (log)')
      return { ok: true }
    },
  }
}

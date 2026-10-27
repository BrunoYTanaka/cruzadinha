// E-mails em texto e HTML. O único dado que entra é o link, escapado no HTML.
export type RenderedEmail = { subject: string; text: string; html: string }

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function page(title: string, paragraphs: string[], link?: { href: string; label: string }): string {
  const body = paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`).join('')
  const anchor = link
    ? `<p><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></p><p>${escapeHtml(link.href)}</p>`
    : ''
  return `<!doctype html><html lang="pt-BR"><body><h1>${escapeHtml(title)}</h1>${body}${anchor}</body></html>`
}

export function verificationEmail(link: string): RenderedEmail {
  const subject = 'Confirme seu e-mail na Cruzadinha'
  const lines = [
    'Para ativar sua conta, confirme seu e-mail pelo link abaixo. Ele vale por 24 horas.',
    'Se você não pediu isso, ignore esta mensagem.',
  ]
  return {
    subject,
    text: `${lines[0]}\n\n${link}\n\n${lines[1]}\n`,
    html: page(subject, lines, { href: link, label: 'Confirmar e-mail' }),
  }
}

export function existingAccountNotice(): RenderedEmail {
  const subject = 'Alguém tentou criar uma conta com o seu e-mail'
  const lines = [
    'Recebemos um pedido de cadastro na Cruzadinha com este e-mail, que já tem uma conta.',
    'Se foi você, entre normalmente ou use "Esqueci a senha". Se não foi, ignore esta mensagem: nada mudou.',
  ]
  return { subject, text: `${lines.join('\n\n')}\n`, html: page(subject, lines) }
}

export function passwordResetEmail(link: string): RenderedEmail {
  const subject = 'Redefina sua senha da Cruzadinha'
  const lines = [
    'Para escolher uma nova senha, use o link abaixo. Ele vale por 1 hora e só pode ser usado uma vez.',
    'Se você não pediu isso, ignore esta mensagem: sua senha continua a mesma.',
  ]
  return {
    subject,
    text: `${lines[0]}\n\n${link}\n\n${lines[1]}\n`,
    html: page(subject, lines, { href: link, label: 'Redefinir senha' }),
  }
}

export function emailChangeEmail(link: string): RenderedEmail {
  const subject = 'Confirme seu novo e-mail na Cruzadinha'
  const lines = [
    'Para trocar o e-mail da sua conta para este endereço, use o link abaixo. Ele vale por 60 minutos e só pode ser usado uma vez.',
    'Se você não pediu isso, ignore esta mensagem: nada muda.',
  ]
  return {
    subject,
    text: `${lines[0]}\n\n${link}\n\n${lines[1]}\n`,
    html: page(subject, lines, { href: link, label: 'Confirmar novo e-mail' }),
  }
}

const brasilia = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'short',
})

// Vai ao endereço atual. Sem o novo endereço e sem link: quem lê pode não ser quem pediu.
export function emailChangeNotice(requestedAt: Date): RenderedEmail {
  const subject = 'Pedido de troca de e-mail'
  const lines = [
    `Em ${brasilia.format(requestedAt)} (horário de Brasília) alguém pediu para trocar o e-mail da sua conta na Cruzadinha. O e-mail só muda se o link enviado ao novo endereço for aberto.`,
    'Se foi você, não precisa fazer nada aqui. Se não foi, troque sua senha.',
  ]
  return { subject, text: `${lines.join('\n\n')}\n`, html: page(subject, lines) }
}

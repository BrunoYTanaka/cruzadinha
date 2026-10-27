import { describe, expect, it } from 'vitest'
import {
  emailChangeEmail,
  emailChangeNotice,
  existingAccountNotice,
  passwordResetEmail,
  verificationEmail,
} from './templates'

const link = 'https://cruzadinha.example.com/verificar-email#token=abc'

describe('e-mail templates', () => {
  it('put the link in the text and in the HTML', () => {
    for (const email of [verificationEmail(link), passwordResetEmail(link)]) {
      expect(email.text).toContain(link)
      expect(email.html).toContain(`href="${link}"`)
      expect(email.subject.length).toBeGreaterThan(0)
    }
  })

  it('escape the link in the HTML', () => {
    const html = verificationEmail('https://x.example/"><script>alert(1)</script>').html
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('the notice carries no link', () => {
    const notice = existingAccountNotice()
    expect(notice.text).not.toContain('http')
    expect(notice.html).not.toContain('href=')
  })
})

describe('e-mail change templates', () => {
  it('asks for the link within 60 minutes and says to ignore it otherwise', () => {
    const mail = emailChangeEmail('https://x.test/confirmar-email#token=abc')
    expect(mail.subject).toBe('Confirme seu novo e-mail na Cruzadinha')
    expect(mail.text).toContain('60 minutos')
    expect(mail.text).toContain('ignore')
    expect(mail.text).toContain('https://x.test/confirmar-email#token=abc')
  })

  it('shows the request time in Brasília and carries neither a link nor an address', () => {
    const mail = emailChangeNotice(new Date('2026-10-27T15:30:00Z'))
    expect(mail.subject).toBe('Pedido de troca de e-mail')
    expect(mail.text).toContain('27/10/2026')
    expect(mail.text).toContain('12:30')
    expect(mail.text).toContain('troque sua senha')
    expect(mail.text + mail.html).not.toMatch(/https?:|@/)
  })
})

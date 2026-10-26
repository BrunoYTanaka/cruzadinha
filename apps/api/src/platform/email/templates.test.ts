import { describe, expect, it } from 'vitest'
import { existingAccountNotice, passwordResetEmail, verificationEmail } from './templates'

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

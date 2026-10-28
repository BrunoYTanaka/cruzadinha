import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

// O script logo depois do #root (feature 048) esvazia a landing pré-gerada quando ela não deve
// aparecer: fora de `/` e com "Ir direto ao jogo" ligado.
const html = readFileSync(join(import.meta.dirname, '..', 'index.html'), 'utf8')
const afterRoot = html.slice(html.indexOf('<div id="root"></div>'))
const script = /<script>([\s\S]*?)<\/script>/.exec(afterRoot)?.[1] ?? ''

function run(path: string, settings: string | null): string {
  window.history.replaceState(null, '', path)
  if (settings !== null) localStorage.setItem('cruzadinha:settings', settings)
  document.body.innerHTML = '<div id="root"><h1>Cruzadinha</h1></div>'
  new Function(script)()
  return document.getElementById('root')?.innerHTML ?? ''
}

const direct = (value: boolean) =>
  JSON.stringify({ v: 1, settings: { directToGame: value }, savedAt: '2026-10-28T00:00:00.000Z' })

afterEach(() => {
  localStorage.clear()
  window.history.replaceState(null, '', '/')
})

describe('script que esvazia a landing pré-gerada', () => {
  it('existe logo depois do #root', () => {
    expect(script).toContain('directToGame')
  })

  it('deixa a landing em / com o ajuste desligado ou sem ajustes', () => {
    expect(run('/', null)).toContain('<h1>')
    expect(run('/', direct(false))).toContain('<h1>')
  })

  it('esvazia fora de /', () => {
    expect(run('/calendario', null)).toBe('')
    expect(run('/jogo/abc', direct(false))).toBe('')
  })

  it('esvazia em / com "Ir direto ao jogo" ligado', () => {
    expect(run('/', direct(true))).toBe('')
  })

  it('não quebra com ajustes ilegíveis', () => {
    expect(run('/', '{não é json')).toContain('<h1>')
  })
})

describe('index.html', () => {
  it('tem título e descrição próprios da landing', () => {
    expect(html).toMatch(/<title>Cruzadinha: [^<]+<\/title>/)
    expect(html).toMatch(/<meta\s+name="description"\s+content="[^"]{40,}"/)
  })
})

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// O jsdom não aplica o CSS dos módulos: as regras do interruptor e do botão "Restaurar padrões"
// (feature 025) são conferidas lendo o arquivo. O e2e `ajustes-configuracoes.spec.ts` mede o
// resultado na tela.
const source = readFileSync(join(import.meta.dirname, 'SettingsDialog.module.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
)

// Corpo da primeira regra cujo seletor é exatamente `selector` (fora de at-rules).
function body(selector: string): string | undefined {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(source)?.[1]
}

describe('interruptor das configurações (feature 025)', () => {
  it('zera o min-height global de toque para manter o trilho de 30 px', () => {
    expect(body('.switch')).toMatch(/min-height:\s*0\s*;/)
  })

  it('devolve a área de toque de 44 px com um ::before transparente fora do trilho', () => {
    const before = body('.switch::before')
    expect(before).toBeDefined()
    expect(before).toMatch(/position:\s*absolute/)
    expect(before).toMatch(/inset:\s*-8px\s+-1px/)
  })
})

describe('botão "Restaurar padrões" (feature 025)', () => {
  it('não usa margem negativa: a caixa visível fica na margem do conteúdo', () => {
    expect(source).not.toMatch(/\.restore\b/)
    expect(source).not.toMatch(/margin-inline-start:\s*-/)
  })
})

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// O jsdom não aplica o CSS dos módulos: os estados de mouse e pressionado (feature 023) são
// conferidos lendo as regras que os definem. O e2e `botoes.spec.ts` confere o resultado na tela.
const root = join(import.meta.dirname, '..')
const css = (path: string) => readFileSync(join(root, path), 'utf8')

type Rule = { selector: string; body: string; atRules: string[] }

// Regras de um arquivo CSS com as at-rules (`@media`, `@layer`) que as envolvem.
function rules(source: string): Rule[] {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, '')
  const found: Rule[] = []
  const stack: { prelude: string; isRule: boolean }[] = []
  let start = 0
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (char === ';' && !stack.at(-1)?.isRule) {
      start = index + 1
    } else if (char === '{') {
      const prelude = text.slice(start, index).trim()
      stack.push({ prelude, isRule: !prelude.startsWith('@') })
      start = index + 1
    } else if (char === '}') {
      const block = stack.pop()
      if (block?.isRule) {
        found.push({
          selector: block.prelude,
          body: text.slice(start, index),
          atRules: stack.map((item) => item.prelude),
        })
      }
      start = index + 1
    }
  }
  return found
}

const ENABLED_ONLY = ":not(:disabled, [aria-disabled='true'])"
const HOVER_MEDIA = '@media (hover: hover)'

type Check = 'hover' | 'disabled'

// Controles que têm estados próprios. Os que usam `buttonClass` herdam os de `.button` e ficam fora:
// ícones, pílulas, tema, legenda, passos e "Tamanho padrão".
const CONTROLS: [file: string, selector: string][] = [
  ['components/Button.module.css', '.button'],
  ['features/settings/SettingsDialog.module.css', '.segmentButton'],
  ['features/settings/SettingsDialog.module.css', '.switch'],
  ['features/library/SourceTabs.module.css', '.tab'],
  ['features/game/ClueList.module.css', '.clue'],
  ['features/game/Keyboard.module.css', '.key'],
]

// Isenções, com o motivo: controles que nunca ficam desativados (o seletor não precisa excluir o
// desativado; o `:hover` de `.clue` usa `.clue:not(.active, .done)`) e o teclado na tela, que só
// aparece em aparelho de toque e por isso não tem mouse por cima.
const EXEMPT: Record<string, Check[]> = {
  'features/settings/SettingsDialog.module.css .segmentButton': ['disabled'],
  'features/settings/SettingsDialog.module.css .switch': ['disabled'],
  'features/library/SourceTabs.module.css .tab': ['disabled'],
  'features/game/ClueList.module.css .clue': ['disabled'],
  'features/game/Keyboard.module.css .key': ['disabled', 'hover'],
}

const usesClass = (selector: string, name: string) =>
  new RegExp(`${name.replace('.', '\\.')}(?![\\w-])`).test(selector)

describe.each(CONTROLS)('estados de %s %s', (file, name) => {
  const all = rules(css(file))
  const stateRules = all.filter(
    (rule) => usesClass(rule.selector, name) && /:hover|:active/.test(rule.selector),
  )
  const exempt = EXEMPT[`${file} ${name}`] ?? []

  it.skipIf(exempt.includes('hover'))('tem :hover só dentro de @media (hover: hover)', () => {
    const hover = stateRules.filter((rule) => rule.selector.includes(':hover'))
    expect(hover.length).toBeGreaterThan(0)
    for (const rule of hover) expect(rule.atRules).toContain(HOVER_MEDIA)
  })

  it('tem :active fora da consulta de hover', () => {
    const active = stateRules.filter((rule) => rule.selector.includes(':active'))
    expect(active.length).toBeGreaterThan(0)
    for (const rule of active) expect(rule.atRules).not.toContain(HOVER_MEDIA)
  })

  it.skipIf(exempt.includes('disabled'))('os estados excluem o botão desativado', () => {
    for (const rule of stateRules) expect(rule.selector).toContain(ENABLED_ONLY)
  })

  it('os estados usam só tokens, sem cor fixa', () => {
    for (const rule of stateRules) expect(rule.body).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i)
  })

  it('as transições do arquivo duram no máximo 150 ms', () => {
    for (const rule of all) {
      for (const [, property, value] of rule.body.matchAll(/(transition(?:-duration)?):([^;]+)/g)) {
        for (const [, amount, unit] of (value ?? '').matchAll(/(\d*\.?\d+)(ms|s)\b/g)) {
          const ms = Number(amount) * (unit === 's' ? 1000 : 1)
          expect(ms, `${property} em ${rule.selector}`).toBeLessThanOrEqual(150)
        }
      }
    }
  })
})

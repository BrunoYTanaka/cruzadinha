import { describe, expect, it } from 'vitest'
import { readCss } from '../../test/css-file'

// O jsdom não aplica o CSS dos módulos: os estados de mouse e pressionado (feature 023) são
// conferidos lendo as regras que os definem. O e2e `botoes.spec.ts` confere o resultado na tela.
const css = readCss

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
  ['Button.module.css', '.button'],
  ['SettingsDialog.module.css', '.segmentButton'],
  ['SettingsDialog.module.css', '.switch'],
  ['SourceTabs.module.css', '.tab'],
  ['ClueList.module.css', '.clue'],
  ['Keyboard.module.css', '.key'],
]

// Isenções, com o motivo: controles que nunca ficam desativados (o seletor não precisa excluir o
// desativado; o `:hover` de `.clue` usa `.clue:not(.active, .done)`) e o teclado na tela, que só
// aparece em aparelho de toque e por isso não tem mouse por cima.
const EXEMPT: Record<string, Check[]> = {
  'SettingsDialog.module.css .segmentButton': ['disabled'],
  'SettingsDialog.module.css .switch': ['disabled'],
  'SourceTabs.module.css .tab': ['disabled'],
  'ClueList.module.css .clue': ['disabled'],
  'Keyboard.module.css .key': ['disabled', 'hover'],
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

  // O limite de 150 ms vale para o retorno de mouse e pressionado. O destaque deslizante do seletor
  // da cruzada padrão (`.thumb`, feature 024) é um movimento de troca e tem o seu próprio teto de
  // 300 ms (FR-012), conferido abaixo e no e2e `ajustes-configuracoes.spec.ts`.
  const SLIDE = '.thumb'
  const limitFor = (selector: string) => (selector === SLIDE ? 300 : 150)

  it('as transições do arquivo duram no máximo 150 ms (300 ms no destaque deslizante)', () => {
    for (const rule of all) {
      for (const [, property, value] of rule.body.matchAll(/(transition(?:-duration)?):([^;]+)/g)) {
        for (const [, amount, unit] of (value ?? '').matchAll(/(\d*\.?\d+)(ms|s)\b/g)) {
          const ms = Number(amount) * (unit === 's' ? 1000 : 1)
          expect(ms, `${property} em ${rule.selector}`).toBeLessThanOrEqual(limitFor(rule.selector))
        }
      }
    }
  })
})

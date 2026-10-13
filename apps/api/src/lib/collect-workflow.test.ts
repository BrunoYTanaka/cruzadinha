import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync(
  new URL('../../../../.github/workflows/collect.yml', import.meta.url),
  'utf8',
)

describe('workflow de coleta', () => {
  it('agenda duas execuções por dia e aceita disparo manual', () => {
    expect(workflow).toContain("cron: '1 3 * * *'")
    expect(workflow).toContain("cron: '0 11 * * *'")
    expect(workflow).toContain('workflow_dispatch:')
  })

  it('usa o segredo só no passo da coleta e como booleano no passo guard', () => {
    const mentions = workflow.match(/secrets\.DATABASE_URL/g) ?? []
    expect(mentions).toHaveLength(2)
    expect(workflow).toContain("HAS_DATABASE_URL: ${{ secrets.DATABASE_URL != '' }}")
    expect(workflow).toMatch(/env:\n\s+DATABASE_URL: \$\{\{ secrets\.DATABASE_URL \}\}/)
    // Nunca no nível do workflow ou do job.
    const header = workflow.slice(0, workflow.indexOf('jobs:'))
    expect(header).not.toContain('secrets.')
  })

  it('tem o passo guard e todos os outros passos dependem dele', () => {
    expect(workflow).toContain('- id: guard')
    const dependent = workflow.match(/- if: steps\.guard\.outputs\.enabled == 'true'/g) ?? []
    expect(dependent).toHaveLength(5)
  })

  it('não imprime variáveis nem liga o modo de rastreio', () => {
    expect(workflow).not.toMatch(/set -x|printenv|\benv\b\s*$|echo\s+\$\{?DATABASE_URL/m)
  })

  it('não aplica migrações', () => {
    expect(workflow).not.toContain('migrate')
  })

  it('não traz valores do .env.example', () => {
    const example = readFileSync(new URL('../../../../.env.example', import.meta.url), 'utf8')
    const values = example
      .split('\n')
      .filter((line) => /^[A-Z_]+=./.test(line))
      .map((line) => line.slice(line.indexOf('=') + 1))
      .filter((value) => value.length > 6)
    for (const value of values) expect(workflow).not.toContain(value)
  })
})

import { describe, expect, it } from 'vitest'
import { readFixture } from './fixtures'
import { DEFAULT_LIMITS, readPuzzleData } from './sandbox'

describe('readPuzzleData', () => {
  it('extrai o XML de um script que o monta por uma tabela de pedaços embaralhada', async () => {
    const result = await readPuzzleData(readFixture('game-valid.js'))
    expect(result).toEqual({ ok: true, value: readFixture('game-valid.xml') })
  })

  it('recusa script sem a variável do jogo', async () => {
    expect(await readPuzzleData(readFixture('game-no-variable.js'))).toEqual({
      ok: false,
      detail: 'script: CrosswordPuzzleData ausente ou não é texto',
    })
  })

  it('recusa a variável que não é texto', async () => {
    expect(await readPuzzleData(readFixture('game-not-string.js'))).toMatchObject({ ok: false })
  })

  it('recusa resultado maior que o limite', async () => {
    const result = await readPuzzleData('var CrosswordPuzzleData = "x".repeat(2000);', {
      ...DEFAULT_LIMITS,
      maxBytes: 1_000,
    })
    expect(result).toEqual({ ok: false, detail: 'script: resultado grande demais' })
  })

  describe('o script não alcança o servidor', () => {
    it.each([
      ['rede', 'game-network.js'],
      ['sistema de arquivos', 'game-require.js'],
      ['variáveis de ambiente', 'game-process.js'],
    ])('não acessa %s', async (_what, file) => {
      expect(await readPuzzleData(readFixture(file))).toEqual({
        ok: false,
        detail: 'script: falhou ao executar',
      })
    })

    it('não enxerga os globais do Node', async () => {
      const probe = await readPuzzleData(
        'var CrosswordPuzzleData = [typeof process, typeof require, typeof fetch, typeof Buffer, typeof globalThis.setTimeout, typeof import_meta].join(",");',
      )
      expect(probe).toEqual({
        ok: true,
        value: 'undefined,undefined,undefined,undefined,undefined,undefined',
      })
    })
  })

  describe('limites', () => {
    it('interrompe um laço infinito dentro do prazo', async () => {
      const started = Date.now()
      const result = await readPuzzleData(readFixture('game-loop.js'), {
        ...DEFAULT_LIMITS,
        timeoutMs: 200,
      })
      expect(result).toMatchObject({ ok: false })
      expect(Date.now() - started).toBeLessThan(2_000)
    })

    it('interrompe o consumo excessivo de memória', async () => {
      const result = await readPuzzleData(readFixture('game-memory.js'), {
        ...DEFAULT_LIMITS,
        memoryBytes: 8 * 1024 * 1024,
      })
      expect(result).toMatchObject({ ok: false })
    })

    it('interrompe a recursão sem fim', async () => {
      expect(await readPuzzleData(readFixture('game-recursion.js'))).toMatchObject({ ok: false })
    })

    it('depois de cada interrupção a sandbox segue funcionando', async () => {
      await readPuzzleData(readFixture('game-loop.js'), { ...DEFAULT_LIMITS, timeoutMs: 100 })
      await readPuzzleData(readFixture('game-memory.js'), {
        ...DEFAULT_LIMITS,
        memoryBytes: 8 * 1024 * 1024,
      })
      expect(await readPuzzleData('var CrosswordPuzzleData = "ok";')).toEqual({
        ok: true,
        value: 'ok',
      })
    })
  })
})

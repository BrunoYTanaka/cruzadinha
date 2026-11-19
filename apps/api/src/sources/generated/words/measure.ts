// Medição de viabilidade da Casa densa (feature 065, SC-001, SC-003, SC-004): preenche, sem
// modelo, 30 datas para cada tamanho e dificuldade com a lista real e o relógio real. Script de
// manutenção; não roda na suíte. Uso: npm run words:measure -w @cruzadinha/api
import { generateGrid } from '../fill'
import { seededRandom, seedFrom } from '../layout'
import { systemClock } from '../../../platform/lib/clock'
import { loadWordList } from './word-list'

const DAYS = 30
const SIZES = [9, 11, 13, 15]
const BANDS = { easy: 1, medium: 2, hard: 3 } as const

const words = await loadWordList()
console.log('tamanho dificuldade  fechadas  palavras(média/mín)  pretas%  tempo(média/máx)')
for (const size of SIZES) {
  for (const [name, maxBand] of Object.entries(BANDS)) {
    let closed = 0
    const counts: number[] = []
    const blacks: number[] = []
    const times: number[] = []
    for (let day = 1; day <= DAYS; day++) {
      const date = `2026-12-${String(day).padStart(2, '0')}`
      const started = Date.now()
      const grid = generateGrid({
        size,
        words,
        maxBand,
        random: seededRandom(seedFrom(`${date}:1`)),
        clock: systemClock,
      })
      times.push(Date.now() - started)
      if (!grid) continue
      closed++
      counts.push(grid.words.length)
      blacks.push(grid.template.black.flat().filter(Boolean).length / (size * size))
    }
    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
    console.log(
      `${String(size).padStart(7)} ${name.padEnd(11)} ${String(closed).padStart(5)}/${DAYS}` +
        `  ${mean(counts).toFixed(1).padStart(8)}/${Math.min(...counts, 999)}` +
        `  ${(mean(blacks) * 100).toFixed(1).padStart(10)}` +
        `  ${(mean(times) / 1000).toFixed(1).padStart(9)}s/${(Math.max(...times) / 1000).toFixed(1)}s`,
    )
  }
}

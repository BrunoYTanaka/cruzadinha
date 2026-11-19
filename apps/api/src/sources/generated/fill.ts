import type { Clock } from '../../platform/lib/clock'
import { makeTemplate, slotsOf, type Slot, type Template } from './template'
import type { Band, WordEntry } from './words/word-list'

// Feature 065: preenche o desenho com palavras da lista por busca com retrocesso (research R7).
// Índice de conjuntos de bits por (comprimento, posição, letra); a cada passo escolhe a corrida
// com menos candidatas (MRV) e confere que toda corrida cruzada ainda tem alguma (forward checking).

const A = 65
const MAX_TRIES = 60

type LengthIndex = { words: WordEntry[]; bits: Uint32Array[][]; chunks: number }
export type WordIndex = Map<number, LengthIndex>
export type FilledGrid = { template: Template; slots: Slot[]; words: WordEntry[] }

export function buildIndex(words: readonly WordEntry[], maxLength: number): WordIndex {
  const byLength = new Map<number, WordEntry[]>()
  for (const word of words) {
    if (word.plain.length > maxLength) continue
    const list = byLength.get(word.plain.length) ?? []
    list.push(word)
    byLength.set(word.plain.length, list)
  }
  const index: WordIndex = new Map()
  for (const [length, list] of byLength) {
    const chunks = Math.ceil(list.length / 32)
    const bits = Array.from({ length }, () =>
      Array.from({ length: 26 }, () => new Uint32Array(chunks)),
    )
    list.forEach((word, i) => {
      for (let pos = 0; pos < length; pos++) {
        bits[pos]![word.plain.charCodeAt(pos) - A]![i >> 5]! |= 1 << (i & 31)
      }
    })
    index.set(length, { words: list, bits, chunks })
  }
  return index
}

function popcount(n: number): number {
  n -= (n >>> 1) & 0x55555555
  n = (n & 0x33333333) + ((n >>> 2) & 0x33333333)
  return (((n + (n >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24
}

type Candidates = { bits: Uint32Array; count: number }
const NONE: Candidates = { bits: new Uint32Array(0), count: 0 }

/** Preenche `template`; `null` se não houver solução ou o orçamento/prazo acabar antes. */
export function fill(
  template: Template,
  index: WordIndex,
  options: {
    random: () => number
    nodeBudget: number
    deadline?: number
    clock?: Clock
    /** Palavras já postas (por corrida, `null` = livre); o reparo local trava o resto da grade. */
    preassigned?: readonly (WordEntry | null)[]
    /** `plain` que não pode entrar (ex.: a palavra que não rendeu dica). */
    banned?: ReadonlySet<string>
  },
): WordEntry[] | null {
  const { size } = template
  const slots = slotsOf(template)
  const letters = Array.from({ length: size }, () => Array<number>(size).fill(-1))
  const assigned: (WordEntry | null)[] = slots.map(() => null)
  const used = new Map<number, Uint32Array>()
  for (const [length, li] of index) used.set(length, new Uint32Array(li.chunks))
  const crossing = new Map<number, number[]>() // célula → corridas que a cobrem
  slots.forEach((slot, i) => {
    for (const [r, c] of slot.cells)
      crossing.set(r * size + c, [...(crossing.get(r * size + c) ?? []), i])
  })

  const candidatesOf = (slot: Slot): Candidates => {
    const li = index.get(slot.length)
    if (!li) return NONE
    const usedBits = used.get(slot.length)!
    const bits = new Uint32Array(li.chunks)
    for (let i = 0; i < li.chunks; i++) bits[i] = ~usedBits[i]!
    const tail = li.words.length & 31
    if (tail !== 0) bits[li.chunks - 1]! &= (1 << tail) - 1
    slot.cells.forEach(([r, c], pos) => {
      const letter = letters[r]![c]!
      if (letter < 0) return
      const mask = li.bits[pos]![letter]!
      for (let i = 0; i < li.chunks; i++) bits[i]! &= mask[i]!
    })
    let count = 0
    for (let i = 0; i < li.chunks; i++) count += popcount(bits[i]!)
    return { bits, count }
  }

  const markUsed = (word: WordEntry) => {
    const li = index.get(word.plain.length)
    const at = li ? li.words.findIndex((w) => w.plain === word.plain) : -1
    if (at >= 0) used.get(word.plain.length)![at >> 5]! |= 1 << (at & 31)
  }
  for (const li of index.values()) {
    for (const word of li.words) if (options.banned?.has(word.plain)) markUsed(word)
  }
  options.preassigned?.forEach((word, i) => {
    if (!word) return
    assigned[i] = word
    markUsed(word)
    slots[i]!.cells.forEach(([r, c], pos) => {
      letters[r]![c] = word.plain.charCodeAt(pos) - A
    })
  })

  const cand = slots.map(candidatesOf)
  if (cand.some((c, i) => !assigned[i] && c.count === 0)) return null
  let nodes = 0
  let aborted = false
  let remaining = assigned.filter((w) => !w).length

  const order = (slot: Slot, c: Candidates): WordEntry[] => {
    const li = index.get(slot.length)!
    const found: number[] = []
    for (let i = 0; i < li.chunks; i++) {
      let word = c.bits[i]!
      while (word !== 0) {
        const bit = 31 - Math.clz32(word & -word)
        found.push(i * 32 + bit)
        word &= word - 1
      }
    }
    const n = found.length
    return found
      .map((w, rank) => ({ w, score: rank / n + options.random() * 0.5 }))
      .sort((a, b) => a.score - b.score)
      .slice(0, MAX_TRIES)
      .map((x) => li.words[x.w]!)
  }

  const solve = (): boolean => {
    if (remaining === 0) return true
    let pick = -1
    for (let i = 0; i < slots.length; i++) {
      if (assigned[i]) continue
      if (pick < 0 || cand[i]!.count < cand[pick]!.count) pick = i
    }
    const slot = slots[pick]!
    const li = index.get(slot.length)!
    const usedBits = used.get(slot.length)!
    for (const word of order(slot, cand[pick]!)) {
      if (++nodes > options.nodeBudget) return ((aborted = true), false)
      if (options.deadline !== undefined && nodes % 128 === 0) {
        if ((options.clock ?? (() => new Date()))().getTime() > options.deadline) {
          return ((aborted = true), false)
        }
      }
      const at = li.words.indexOf(word)
      if (usedBits[at >> 5]! & (1 << (at & 31))) continue
      // Põe a palavra, lembrando o que mudou para desfazer.
      const filled: number[] = []
      slot.cells.forEach(([r, c], pos) => {
        if (letters[r]![c]! < 0) {
          letters[r]![c] = word.plain.charCodeAt(pos) - A
          filled.push(r * size + c)
        }
      })
      usedBits[at >> 5]! |= 1 << (at & 31)
      assigned[pick] = word
      remaining--
      const saved = new Map<number, Candidates>()
      let ok = true
      for (const [r, c] of slot.cells) {
        for (const other of crossing.get(r * size + c)!) {
          if (other === pick || assigned[other] || saved.has(other)) continue
          saved.set(other, cand[other]!)
          cand[other] = candidatesOf(slots[other]!)
          if (cand[other]!.count === 0) ok = false
        }
      }
      if (ok && solve()) return true
      for (const [other, old] of saved) cand[other] = old
      remaining++
      assigned[pick] = null
      usedBits[at >> 5]! &= ~(1 << (at & 31))
      for (const cell of filled) letters[Math.floor(cell / size)]![cell % size] = -1
      if (aborted) return false
    }
    return false
  }

  return solve() ? (assigned as WordEntry[]) : null
}

/**
 * Reparo local (clarificação 2026-11-19): troca as palavras de `failed` (índices de corrida) e as
 * que as cruzam, travando o resto da grade; as de `failed` ficam proibidas. Abre a região aos poucos:
 * vizinhos diretos, depois até 4 níveis de cruzamento (medido: fecha em 84–100% das grades reais). Devolve as palavras novas por corrida, ou
 * `null` se a região não fechar.
 */
export function refillRegion(
  grid: FilledGrid,
  failed: readonly number[],
  index: WordIndex,
  options: { random: () => number; nodeBudget?: number },
): WordEntry[] | null {
  const { slots } = grid
  const cellsOf = (i: number) => new Set(slots[i]!.cells.map(([r, c]) => `${r},${c}`))
  const neighbours = (set: Set<number>) => {
    const cells = new Set([...set].flatMap((i) => [...cellsOf(i)]))
    const out = new Set(set)
    slots.forEach((slot, i) => {
      if (slot.cells.some(([r, c]) => cells.has(`${r},${c}`))) out.add(i)
    })
    return out
  }
  const banned = new Set(failed.map((i) => grid.words[i]!.plain))
  let region = new Set(failed)
  for (let radius = 1; radius <= 4; radius++) {
    region = neighbours(region)
    const words = fill(grid.template, index, {
      random: options.random,
      nodeBudget: options.nodeBudget ?? 20_000,
      preassigned: grid.words.map((w, i) => (region.has(i) ? null : w)),
      banned,
    })
    if (words) return words
  }
  return null
}

/**
 * Grade densa fechada, ou `null`. Troca de desenho ao esgotar o orçamento de nós e, se a faixa
 * pedida não fechar em metade do prazo restante, alarga para a seguinte (uma de cada vez).
 */
export function generateGrid(options: {
  size: number
  words: readonly WordEntry[]
  maxBand: Band
  random: () => number
  clock: Clock
  timeLimitMs?: number
  maxSlot?: number
  nodeBudget?: number
  /** Desenhos por faixa; no relógio real o prazo acaba antes. */
  maxTemplates?: number
  /** Desenho de cada tentativa; os testes passam um fixo. */
  templateSource?: () => Template | null
}): FilledGrid | null {
  const { clock } = options
  const maxSlot = options.maxSlot ?? 7
  const end = clock().getTime() + (options.timeLimitMs ?? 20_000)
  for (let band = options.maxBand; band <= 3; band++) {
    const index = buildIndex(
      options.words.filter((w) => w.band <= band),
      maxSlot,
    )
    const now = clock().getTime()
    const stepEnd = band === 3 ? end : now + (end - now) / 2
    for (let tried = 0; tried < (options.maxTemplates ?? 1000); tried++) {
      if (clock().getTime() > stepEnd) break
      const template =
        options.templateSource?.() ?? makeTemplate(options.size, options.random, { maxSlot })
      if (!template) continue
      const words = fill(template, index, {
        random: options.random,
        nodeBudget: options.nodeBudget ?? 4000,
        deadline: stepEnd,
        clock,
      })
      if (words) return { template, slots: slotsOf(template), words }
    }
  }
  return null
}

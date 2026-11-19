// Lista de palavras da Casa (feature 065): lida da constante gerada por `build.ts`.

export type Band = 1 | 2 | 3
export type WordEntry = { plain: string; form: string; band: Band }

export function parseWordList(text: string): WordEntry[] {
  return text.split('\n').map((line) => {
    const [plain, form, band] = line.split('\t')
    if (!plain || !form || (band !== '1' && band !== '2' && band !== '3')) {
      throw new Error('linha malformada na lista de palavras')
    }
    return { plain, form, band: Number(band) as Band }
  })
}

export function wordsFor(
  list: readonly WordEntry[],
  options: { maxBand: Band; exclude?: ReadonlySet<string> },
): WordEntry[] {
  return list.filter((w) => w.band <= options.maxBand && !options.exclude?.has(w.plain))
}

let cached: Promise<WordEntry[]> | undefined

/** Só a coleta carrega: o `import()` vira um chunk à parte e o servidor nunca o lê. */
export function loadWordList(): Promise<WordEntry[]> {
  cached ??= import('./word-list.data').then((m) => parseWordList(m.WORD_LIST))
  return cached
}

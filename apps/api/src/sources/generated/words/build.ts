// Monta a lista de palavras da Casa (feature 065): palavras da lista de frequência que o Hunspell
// pt_BR aceita. Script de manutenção: faz pedidos de rede só para baixar as fontes, nunca roda na
// suíte, na CI nem no servidor. Uso: npm run words:build -w @cruzadinha/api
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { loadModule } from 'hunspell-asm'
import { isBlockedAnswer } from '../blocklist'
import { plain } from '../normalize'

const FREQUENCY_COMMIT = '525f9b560de45753a5ea01069454e72e9aa541c6'
const DICTIONARY_COMMIT = '5cf23af85b47be6e398add826da1a02175be4238'
const SOURCES = [
  {
    file: 'pt_br_50k.txt',
    url: `https://raw.githubusercontent.com/hermitdave/FrequencyWords/${FREQUENCY_COMMIT}/content/2018/pt_br/pt_br_50k.txt`,
  },
  {
    file: 'pt_BR.aff',
    url: `https://raw.githubusercontent.com/LibreOffice/dictionaries/${DICTIONARY_COMMIT}/pt_BR/pt_BR.aff`,
  },
  {
    file: 'pt_BR.dic',
    url: `https://raw.githubusercontent.com/LibreOffice/dictionaries/${DICTIONARY_COMMIT}/pt_BR/pt_BR.dic`,
  },
]

const SOURCES_DIR = new URL('../../../../.word-sources/', import.meta.url)
const EXCLUDED = new URL('./excluded.txt', import.meta.url)
const OUTPUT = new URL('./word-list.data.ts', import.meta.url)

const MIN_LENGTH = 3
const MAX_LENGTH = 15
// Posição na lista de frequência (1 = mais comum): faixa 1 até 15 000, 2 até 30 000, 3 o resto.
const bandOf = (position: number): 1 | 2 | 3 =>
  position <= 15_000 ? 1 : position <= 30_000 ? 2 : 3

async function download(): Promise<void> {
  await mkdir(SOURCES_DIR, { recursive: true })
  for (const { file, url } of SOURCES) {
    if (existsSync(new URL(file, SOURCES_DIR))) continue
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
    await writeFile(new URL(file, SOURCES_DIR), Buffer.from(await response.arrayBuffer()))
    console.log(`baixado ${file}`)
  }
}

async function main(): Promise<void> {
  await download()
  const excluded = new Set(
    (await readFile(EXCLUDED, 'utf8'))
      .split('\n')
      .map((line) => line.replace(/#.*/, '').trim().toUpperCase())
      .filter(Boolean),
  )
  const frequency = (await readFile(new URL('pt_br_50k.txt', SOURCES_DIR), 'utf8'))
    .replace(/^\uFEFF/, '')
    .split('\n')
    .map((line) => line.split(' ')[0]!.trim())
    .filter(Boolean)

  const factory = await loadModule()
  const read = async (file: string) => new Uint8Array(await readFile(new URL(file, SOURCES_DIR)))
  const hunspell = factory.create(
    factory.mountBuffer(await read('pt_BR.aff'), 'pt_BR.aff'),
    factory.mountBuffer(await read('pt_BR.dic'), 'pt_BR.dic'),
  )

  const removed = { formato: 0, hunspell: 0, curadoria: 0, bloqueio: 0, repetida: 0 }
  const seen = new Set<string>()
  const lines: string[] = []
  const byLength = new Map<number, number>()
  const byBand = [0, 0, 0, 0]
  frequency.forEach((form, index) => {
    const key = plain(form)
    if (!/^[a-zàáâãéêíóôõúüç]+$/.test(form) || key.length < MIN_LENGTH || key.length > MAX_LENGTH) {
      removed.formato++
    } else if (!hunspell.spell(form)) removed.hunspell++
    else if (excluded.has(key)) removed.curadoria++
    else if (isBlockedAnswer(key)) removed.bloqueio++
    else if (seen.has(key)) removed.repetida++
    else {
      seen.add(key)
      const band = bandOf(index + 1)
      lines.push(`${key}\t${form}\t${band}`)
      byLength.set(key.length, (byLength.get(key.length) ?? 0) + 1)
      byBand[band]!++
    }
  })
  hunspell.dispose()

  const header =
    `// GERADO por src/sources/generated/words/build.ts — não editar à mão.\n` +
    `// Fontes: FrequencyWords ${FREQUENCY_COMMIT} (CC BY-SA 4.0), LibreOffice dictionaries pt_BR ${DICTIONARY_COMMIT} (VERO, LGPLv3/MPL).\n` +
    `// Licença desta lista: CC BY-SA 4.0. Ver words/NOTICE.md.\n`
  await writeFile(OUTPUT, `${header}export const WORD_LIST = \`${lines.join('\n')}\`\n`)

  console.log(`total: ${lines.length}`)
  console.log('por faixa:', { 1: byBand[1], 2: byBand[2], 3: byBand[3] })
  console.log('por comprimento:', Object.fromEntries([...byLength].sort((a, b) => a[0] - b[0])))
  console.log('removidas:', removed)
}

await main()

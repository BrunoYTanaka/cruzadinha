import { isoDateSchema } from '@cruzadinha/shared'
import { clueText } from '../common/clue-text'

export type EditionPageInfo = {
  /** Data de publicação da edição, AAAA-MM-DD, como a página informa. */
  date: string
  author: string | null
  /** Caminho do arquivo do jogo, como `/jogos/CC689.js`. */
  scriptPath: string
  /** Caminho da página da edição anterior; `null` na primeira. */
  previousPath: string | null
}

export type ParsePageResult = { ok: true; page: EditionPageInfo } | { ok: false; detail: string }

// Só caminhos da própria fonte entram: o endereço do servidor é fixo no adaptador.
const EDITION_PATH = '/jogo/i/id/\\d+/[a-z0-9-]+/'
const POSTED = /postado em\s+(\d{2})\/(\d{2})\/(\d{4})/i
const AUTHOR = /postado em[^<]*?por\s*<b>([^<]*)<\/b>/i
const SCRIPT = /\/jogos\/CC\d+\.js/
const PREVIOUS = new RegExp(
  `<a\\s+href="(${EDITION_PATH})"[^>]*>(?:(?!</a>)[\\s\\S])*?Anterior\\s*</a\\s*>`,
  'i',
)
const LATEST = new RegExp(
  `href="(${EDITION_PATH.replace('[a-z0-9-]+', 'cruzadas-classicas-\\d+')})"`,
)

/**
 * Lê da página da edição a data, o autor, o arquivo do jogo e o link da anterior. Função pura. O
 * detalhe da falha nomeia o campo que faltou, nunca um trecho da página.
 */
export function parseEditionPage(html: string): ParsePageResult {
  const posted = POSTED.exec(html)
  if (!posted) return { ok: false, detail: 'página: data não encontrada' }
  const [, day, month, year] = posted
  const date = `${year}-${month}-${day}`
  if (!isoDateSchema.safeParse(date).success) return { ok: false, detail: 'página: data inválida' }

  const script = SCRIPT.exec(html)
  if (!script) return { ok: false, detail: 'página: arquivo do jogo não encontrado' }

  const rawAuthor = AUTHOR.exec(html)?.[1]
  return {
    ok: true,
    page: {
      date,
      author: rawAuthor === undefined ? null : clueText(rawAuthor),
      scriptPath: script[0],
      previousPath: PREVIOUS.exec(html)?.[1] ?? null,
    },
  }
}

/** Da lista de cruzadas clássicas, o caminho da edição mais nova (a primeira da lista). */
export function parseLatestEdition(html: string): string | null {
  return LATEST.exec(html)?.[1] ?? null
}

const SAFE_PATH = new RegExp(`^${EDITION_PATH}$`)

/** Confere que um caminho vindo da página é de uma edição da própria fonte. */
export function isEditionPath(path: string): boolean {
  return SAFE_PATH.test(path)
}

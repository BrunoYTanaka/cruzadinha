// Confere o dist/ depois do build (feature 048): a landing pré-gerada, os arquivos para buscadores e
// o service worker. Rode com `npm run check:build-output -w @cruzadinha/web` depois de `npm run build`.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const dist = join(import.meta.dirname, '..', 'dist')
const read = (name) => readFileSync(join(dist, name), 'utf8')
const failures = []
const check = (ok, message) => {
  if (!ok) failures.push(message)
}

const html = read('index.html')
const start = html.indexOf('<div id="root">')
const rootHtml = start === -1 ? '' : html.slice(start)

check(/<title>Cruzadinha: [^<]+<\/title>/.test(html), 'index.html sem o título da landing')
check(/<meta\s+name="description"\s+content="[^"]{40,}"/.test(html), 'index.html sem descrição')
check((html.match(/<h1[ >]/g) ?? []).length === 1, 'index.html deve ter um único <h1>')
check((html.match(/<main[ >]/g) ?? []).length === 1, 'index.html deve ter um único <main>')
check(html.includes('id="conteudo"'), 'index.html sem o main#conteudo')
check(rootHtml.includes('Jogar a cruzada de hoje'), 'index.html sem a chamada principal')
// O texto da landing alinhada ao mockup (feature 050): rótulos, títulos e a frase de destaque.
for (const text of [
  'Como funciona',
  'Abriu, jogou. O resto é opcional.',
  'Experimente',
  'Uma mini cruzada, bem aqui.',
  'Fontes',
  'A cruzada de hoje já está esperando.',
]) {
  check(rootHtml.includes(text), `index.html sem "${text}"`)
}
const h1 = rootHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? ''
check(h1.includes('Palavras cruzadas'), 'o <h1> deve trazer a frase de destaque')

// Toda classe de CSS Module do HTML pré-gerado precisa existir no CSS gerado.
const css = readdirSync(join(dist, 'assets'))
  .filter((file) => file.endsWith('.css'))
  .map((file) => readFileSync(join(dist, 'assets', file), 'utf8'))
  .join('\n')
const classes = new Set(
  [...rootHtml.matchAll(/class="([^"]*)"/g)]
    .flatMap((match) => match[1].split(/\s+/))
    .filter(Boolean),
)
const missing = [...classes].filter((name) => !css.includes(`.${name}`))
check(missing.length === 0, `classes do HTML sem CSS: ${missing.join(', ')}`)

// O service worker guarda o index.html com a revisão do arquivo final (o plugin roda antes do PWA).
const revision = createHash('md5')
  .update(readFileSync(join(dist, 'index.html')))
  .digest('hex')
// O service worker pode estar minificado (`revision:"…"`) ou não (`"revision": "…"`).
check(
  new RegExp(`"?revision"?:\\s*"${revision}"`).test(read('sw.js')),
  'sw.js com a revisão errada do index.html',
)

const robots = read('robots.txt').split('\n')
check(robots.includes('User-agent: *'), 'robots.txt sem User-agent')
check(!robots.includes('Disallow: /'), 'robots.txt não pode bloquear o site todo')
const siteUrl = process.env.SITE_URL
if (siteUrl) {
  const sitemap = read('sitemap.xml')
  check((sitemap.match(/<loc>/g) ?? []).length === 1, 'sitemap.xml deve listar só a landing')
  check(sitemap.includes(`<loc>${siteUrl}/</loc>`), 'sitemap.xml sem a landing')
  check(robots.includes(`Sitemap: ${siteUrl}/sitemap.xml`), 'robots.txt sem a linha Sitemap')
}

if (failures.length > 0) {
  console.error(failures.map((message) => `✗ ${message}`).join('\n'))
  process.exit(1)
}
console.log('dist/ confere (landing, robots.txt, sitemap.xml, service worker).')

import react from '@vitejs/plugin-react'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build, loadEnv, type Plugin, type ResolvedConfig } from 'vite'

// Landing pré-gerada no build (feature 048): o texto dela precisa estar no HTML entregue, sem
// JavaScript nem API, para o buscador ler. O plugin compila `src/landing-entry.tsx` num build SSR,
// põe o HTML dele no `#root` do `index.html` e gera `sitemap.xml` e `robots.txt` a partir de
// `SITE_URL`.

const ROOT_DIV = '<div id="root"></div>'

// `SITE_URL` é a origem pública do site, sem barra final (a mesma variável do workflow de publicação).
export function readSiteUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  if (!/^https?:\/\/[^/\s?#]+$/.test(trimmed)) {
    throw new Error(`SITE_URL inválida: use a origem sem barra final, como https://exemplo.com`)
  }
  return trimmed
}

export function buildSitemap(siteUrl: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
  </url>
</urlset>
`
}

// Rastrear tudo é necessário: o `noindex` das outras páginas só vale se o buscador puder lê-las.
export function buildRobots(siteUrl: string | undefined): string {
  const lines = ['User-agent: *', 'Disallow: /api/']
  if (siteUrl) lines.push(`Sitemap: ${siteUrl}/sitemap.xml`)
  return `${lines.join('\n')}\n`
}

export function injectLanding(html: string, landing: string): string {
  if (!html.includes(ROOT_DIV)) throw new Error('index.html sem o #root vazio esperado')
  return html.replace(ROOT_DIV, `<div id="root">${landing}</div>`)
}

// Fontes do topo da landing. Sem pré-carga elas chegam depois do primeiro desenho e a troca da fonte
// desloca o título e o cabeçalho (visto num CPU lento, ~0,07 de deslocamento).
const PRELOAD_FONTS = [
  /fraunces-latin-wght-normal-.*\.woff2$/,
  /roboto-latin-400-normal-.*\.woff2$/,
  /roboto-latin-500-normal-.*\.woff2$/,
  /roboto-latin-700-normal-.*\.woff2$/,
]

export function preloadFonts(html: string, fileNames: string[]): string {
  const links = PRELOAD_FONTS.flatMap((pattern) => fileNames.filter((name) => pattern.test(name)))
    .map((name) => `<link rel="preload" as="font" type="font/woff2" href="/${name}" crossorigin />`)
    .join('\n    ')
  return links ? html.replace('</head>', `    ${links}\n  </head>`) : html
}

export function landingPrerenderPlugin(): Plugin {
  let config: ResolvedConfig
  let landing = ''
  let siteUrl: string | undefined
  return {
    name: 'cruzadinha-landing-prerender',
    apply: 'build',
    configResolved(resolved) {
      config = resolved
    },
    async buildStart() {
      // O build SSR abaixo roda este mesmo arquivo de configuração: sem isto ele se chamaria.
      if (config.build.ssr) return
      const env = loadEnv(config.mode, config.envDir || config.root, '')
      siteUrl = readSiteUrl(process.env.SITE_URL ?? env.SITE_URL)
      if (!siteUrl) {
        this.warn('SITE_URL não definida: o build sai sem sitemap.xml e sem a linha Sitemap.')
      }
      const outDir = join(config.root, 'node_modules', '.cache', 'landing-ssr')
      mkdirSync(outDir, { recursive: true })
      await build({
        configFile: false,
        root: config.root,
        envDir: config.envDir,
        logLevel: 'warn',
        plugins: [react()],
        ssr: { noExternal: ['@cruzadinha/shared'] },
        build: { ssr: 'src/landing-entry.tsx', outDir, emptyOutDir: true, write: true },
      })
      const module = (await import(
        `${pathToFileURL(join(outDir, 'landing-entry.js')).href}?t=${Date.now()}`
      )) as { renderLanding: () => string }
      landing = module.renderLanding()
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!landing) return html
        return preloadFonts(injectLanding(html, landing), Object.keys(ctx.bundle ?? {}))
      },
    },
    generateBundle() {
      if (config.build.ssr) return
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: buildRobots(siteUrl) })
      if (siteUrl) {
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: buildSitemap(siteUrl) })
      }
    },
  }
}

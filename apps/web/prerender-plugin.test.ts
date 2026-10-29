// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  buildRobots,
  buildSitemap,
  injectLanding,
  preloadFonts,
  readSiteUrl,
} from './prerender-plugin.ts'

describe('readSiteUrl', () => {
  it('aceita a origem sem barra final e ignora o vazio', () => {
    expect(readSiteUrl('https://exemplo.pages.dev')).toBe('https://exemplo.pages.dev')
    expect(readSiteUrl(' http://localhost:4173 ')).toBe('http://localhost:4173')
    expect(readSiteUrl(undefined)).toBeUndefined()
    expect(readSiteUrl('')).toBeUndefined()
  })

  it.each(['exemplo.com', 'https://exemplo.com/', 'https://exemplo.com/x', 'ftp://exemplo.com'])(
    'recusa %s',
    (value) => {
      expect(() => readSiteUrl(value)).toThrow('SITE_URL inválida')
    },
  )
})

describe('sitemap e robots', () => {
  it('o sitemap lista só a landing', () => {
    const xml = buildSitemap('https://exemplo.pages.dev')
    expect(xml.match(/<loc>/g)).toHaveLength(1)
    expect(xml).toContain('<loc>https://exemplo.pages.dev/</loc>')
  })

  it('o robots libera o rastreio, protege a API e aponta o sitemap só com SITE_URL', () => {
    const withSite = buildRobots('https://exemplo.pages.dev').split('\n')
    expect(withSite).toContain('User-agent: *')
    expect(withSite).toContain('Disallow: /api/')
    expect(withSite).not.toContain('Disallow: /')
    expect(withSite).toContain('Sitemap: https://exemplo.pages.dev/sitemap.xml')
    expect(buildRobots(undefined)).not.toContain('Sitemap')
  })
})

describe('injectLanding', () => {
  it('põe o HTML no #root vazio', () => {
    expect(injectLanding('<body><div id="root"></div><script></script></body>', '<h1>x</h1>')).toBe(
      '<body><div id="root"><h1>x</h1></div><script></script></body>',
    )
  })

  it('recusa um index.html sem o #root vazio', () => {
    expect(() => injectLanding('<div id="root">já tem</div>', '<h1>x</h1>')).toThrow('#root')
  })
})

describe('preloadFonts', () => {
  it('pré-carrega só as fontes do topo que estão no bundle', () => {
    const html = preloadFonts('<head>\n  </head>', [
      'assets/fraunces-latin-wght-normal-abc.woff2',
      'assets/roboto-latin-500-normal-def.woff2',
      'assets/roboto-mono-latin-500-normal-ghi.woff2',
      'assets/index-xyz.js',
    ])
    expect(html).toContain(
      '<link rel="preload" as="font" type="font/woff2" href="/assets/fraunces-latin-wght-normal-abc.woff2" crossorigin />',
    )
    expect(html).toContain('roboto-latin-500-normal-def.woff2')
    expect(html).not.toContain('mono')
    expect(html).not.toContain('index-xyz')
  })

  it('deixa o HTML como está sem nenhuma fonte no bundle', () => {
    expect(preloadFonts('<head></head>', ['assets/index-xyz.js'])).toBe('<head></head>')
  })
})

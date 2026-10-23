import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'

// Monta o conteúdo do version.json do site (feature 012, FR-023): a versão do apps/web e o commit
// publicado (GITHUB_SHA na CI, o HEAD do git localmente, "desconhecido" sem nenhum dos dois). O git
// só é consultado sem GITHUB_SHA (feature 028): no container da CI ele recusa o diretório montado.
export function siteVersionJson(
  version: string,
  env: Record<string, string | undefined>,
  readHead: () => string | undefined,
): string {
  const commit = env.GITHUB_SHA || readHead() || 'desconhecido'
  return `${JSON.stringify({ version, commit })}\n`
}

// O stderr do git é descartado: sem repositório ou com outro dono, o `fatal:` dele não deve sujar o
// log do build, e a falta de commit já cai em "desconhecido".
export function readGitHead(cwd?: string): string | undefined {
  try {
    return (
      execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim() || undefined
    )
  } catch {
    return undefined
  }
}

// Grava dist/version.json no build; o workflow de publicação compara essa versão com a última
// lançada para saber se precisa publicar o site.
export function siteVersionPlugin(): Plugin {
  return {
    name: 'cruzadinha-site-version',
    apply: 'build',
    generateBundle() {
      const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
        version: string
      }
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: siteVersionJson(pkg.version, process.env, readGitHead),
      })
    },
  }
}

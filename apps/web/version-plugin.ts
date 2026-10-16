import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'

// Monta o conteúdo do version.json do site (feature 012, FR-023): a versão do apps/web e o commit
// publicado (GITHUB_SHA na CI, o HEAD do git localmente, "desconhecido" sem nenhum dos dois).
export function siteVersionJson(
  version: string,
  env: Record<string, string | undefined>,
  gitHead: string | undefined,
): string {
  const commit = env.GITHUB_SHA || gitHead || 'desconhecido'
  return `${JSON.stringify({ version, commit })}\n`
}

function readGitHead(): string | undefined {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() || undefined
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
        source: siteVersionJson(pkg.version, process.env, readGitHead()),
      })
    },
  }
}

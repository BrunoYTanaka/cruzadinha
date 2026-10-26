import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const srcDir = join(import.meta.dirname, '..')

function find(dir: string, name: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return find(path, name)
    return entry.name === name ? [path] : []
  })
}

// Os testes que leem CSS pelo nome do arquivo não dependem de qual pasta ele mora.
export function readCss(name: string): string {
  const found = find(srcDir, name)
  const [file] = found
  if (found.length !== 1 || !file) throw new Error(`${name}: ${found.length} arquivos encontrados`)
  return readFileSync(file, 'utf8')
}

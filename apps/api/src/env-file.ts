import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

function findEnvFile(start: string): string | undefined {
  let dir = start
  for (;;) {
    const candidate = join(dir, '.env')
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
}

// Fora de produção, carrega o .env mais próximo (a raiz do repositório, no desenvolvimento).
export function loadDotEnvIfPresent(): void {
  if (process.env.NODE_ENV === 'production') return
  const envFile = findEnvFile(process.cwd())
  if (envFile) process.loadEnvFile(envFile)
}

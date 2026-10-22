// Falha se dois itens compartilham o mesmo número: pastas de specs/ (NNN-slug) e arquivos de
// docs/data-definitions (DDE-NNN) e docs/entity-relationship-diagrams (ERD-NNN). O Spec Kit e as
// skills escolhem o próximo número olhando só a árvore local, então branches paralelas podem
// repetir o mesmo número sem conflito de Git.
//
// Com --remote, soma os nomes que já estão em origin/main aos locais (o mesmo nome nos dois lados
// é o mesmo item). Se o fetch falhar, avisa e segue só com a árvore local.
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { argv, exit, stderr, stdout } from 'node:process'

const groups = [
  { dir: 'specs', pattern: /^(\d{3,})-/ },
  { dir: 'docs/data-definitions', pattern: /^(DDE-\d+)-/ },
  { dir: 'docs/entity-relationship-diagrams', pattern: /^(ERD-\d+)-/ },
]

const REMOTE_REF = 'origin/main'

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
}

function remoteNames(dir) {
  const out = git('ls-tree', '--name-only', `${REMOTE_REF}:${dir}`)
  return out.split('\n').filter(Boolean)
}

const useRemote = argv.includes('--remote')
let remoteReady = false
if (useRemote) {
  try {
    git('fetch', '--quiet', 'origin', 'main')
    remoteReady = true
  } catch {
    stderr.write(`Aviso: não foi possível buscar ${REMOTE_REF}; checando só a árvore local.\n`)
  }
}

let failed = false

for (const { dir, pattern } of groups) {
  const names = new Set(readdirSync(dir))
  if (remoteReady) {
    try {
      for (const name of remoteNames(dir)) names.add(name)
    } catch {
      // a pasta ainda não existe em origin/main
    }
  }
  const byId = new Map()
  for (const name of names) {
    const id = pattern.exec(name)?.[1]
    if (id === undefined) continue
    const key = id.replace(/\d+$/, (digits) => String(Number(digits)))
    byId.set(key, [...(byId.get(key) ?? []), name])
  }
  for (const [id, found] of byId) {
    if (found.length < 2) continue
    failed = true
    stderr.write(`Identificador repetido em ${dir}: ${id} -> ${found.join(', ')}\n`)
  }
}

if (failed) exit(1)
stdout.write('Identificadores únicos.\n')

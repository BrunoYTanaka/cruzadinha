// Falha se o nome da branch não segue `<type>/<kebab-description>` (CLAUDE.md, "Conventions"),
// com os mesmos types do Conventional Commits. Sem argumento, usa a branch atual; o CI passa o
// nome da branch de origem do pull request.
//
// Ficam de fora: `main` e as branches do release-please (`release-please--*`), criadas pelo bot.
// Em HEAD destacado (rebase, checkout de tag) não há nome para validar e o script passa.
import { execFileSync } from 'node:child_process'
import { argv, exit, stderr, stdout } from 'node:process'

const TYPES = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore']
const PATTERN = new RegExp(`^(${TYPES.join('|')})/[a-z0-9]+(-[a-z0-9]+)*$`)
const EXEMPT = [/^main$/, /^release-please--/]

const branch =
  argv[2] ?? execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim()

if (branch === 'HEAD' || EXEMPT.some((re) => re.test(branch)) || PATTERN.test(branch)) {
  stdout.write(`Nome da branch ok: ${branch}\n`)
  exit(0)
}

stderr.write(
  `Branch "${branch}" fora do formato <type>/<kebab-description>.\n` +
    `Types aceitos: ${TYPES.join(', ')}. Exemplo: feat/029-nome-curto, fix/erro-no-login.\n` +
    `Renomeie com: git branch -m <novo-nome>\n` +
    `Se já há PR aberto, não renomeie a branch de origem (fecha o PR); abra outro PR com a branch certa.\n`,
)
exit(1)

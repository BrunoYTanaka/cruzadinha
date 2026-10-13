# Contrato: comando `puzzles collect` e workflow agendado

**Feature**: [spec.md](../spec.md) | **Modelo**: [data-model.md](../data-model.md)

## Comando

```sh
npm run cli -w @cruzadinha/api -- puzzles collect          # desenvolvimento
node apps/api/dist/cli.mjs puzzles collect                 # imagem e CI
```

Sem argumentos nem opções. Lê `DATABASE_URL` e, opcionalmente, `COLLECT_HISTORY_DAYS` (inteiro de 0 a 365, padrão 31; valor inválido encerra com código 1 e mensagem de configuração). Usa a fonte real (`createOgloboSource()`), de modo que não é executado pela suíte de testes.

### Comportamento

1. Calcula hoje em `America/Sao_Paulo`.
2. Monta as datas candidatas: hoje e os `COLLECT_HISTORY_DAYS` dias anteriores, em ordem decrescente.
3. Remove as que já estão no banco (zero pedidos para elas).
4. Para cada restante, uma requisição à fonte, com pausa de 2 s entre requisições. Cada puzzle recebido é gravado com `onConflictDoNothing`.
5. `unavailable` não é falha. `rate-limited` interrompe a execução. Outras falhas são registradas e a coleta segue.

### Saída (stdout, português, sem token, URL do banco ou conteúdo bruto)

```text
Coleta de puzzles: 3 gravados, 28 já existentes, 1 indisponível, 0 falhas.
Gravados: 2026-10-13, 2026-10-12, 2026-10-11
```

Em falha ou interrupção, as linhas de falha e pendência vão para stderr, por exemplo `Falhou em 2026-10-09: source-down` e `Interrompido por limite de uso da fonte; pendentes: 2026-10-08, ...`.

### Código de saída

| Código | Quando |
|---|---|
| `0` | nada falhou e a execução não foi interrompida (inclui "tudo já gravado") |
| `1` | alguma data falhou ou a fonte limitou o uso |
| `2` | uso incorreto (argumento inesperado) |

## Workflow `.github/workflows/collect.yml`

| Item | Valor |
|---|---|
| Gatilhos | `schedule` (`1 3 * * *` e `0 11 * * *`, UTC) e `workflow_dispatch` |
| Concorrência | `concurrency: collect`, sem cancelar a execução em andamento |
| Ambiente | `ubuntu-latest`, Node pelo `.nvmrc`, `HUSKY: 0` |
| Passos | `npm ci` → `npm run build -w @cruzadinha/api` → `node apps/api/dist/cli.mjs puzzles collect` (sem migração: o schema é aplicado pela API ao subir) |
| Segredo | `DATABASE_URL` em `secrets`, só no passo que usa |
| Sem o segredo | passo `guard` com booleano `secrets.DATABASE_URL != ''`: no `schedule` a coleta é ignorada com um aviso (o job fica verde); no `workflow_dispatch` o job falha com erro. Evita falhas diárias antes da implantação |
| Variável | `COLLECT_HISTORY_DAYS` opcional, de `vars` (Settings → Variables); sem ela vale o padrão 31 |
| Falha | o job termina com o código de saída do comando; o GitHub notifica o autor |

O workflow não imprime variáveis de ambiente nem usa `set -x`.

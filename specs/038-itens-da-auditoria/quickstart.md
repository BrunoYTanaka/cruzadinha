# Quickstart: validar a feature

Pré-requisitos: Node 24, Docker (para `test:int`).

1. **Dependências**: `npm audit --omit=dev` deve listar 0 vulnerabilidades; depois `npm ci && npm run typecheck && npm test`.
2. **Limites atômicos**: `npm run test:int` - os testes novos disparam 40 pedidos simultâneos de dias não salvos do mesmo endereço (limite 30) e esperam no máximo 30 idas à fonte falsa; o mesmo para cadastro e configurações.
3. **Log de falha**: `cd apps/api && npx vitest run src/modules/puzzles` - um adaptador que lança deve chamar `onError` com fonte, data e erro, e a outra fonte seguir coletando.
4. **Aviso por issue** (manual, uma vez): em um fork ou depois do merge, `gh workflow run collect.yml` com uma fonte quebrada de propósito (ex.: URL inválida só no ambiente de teste) e conferir 1 issue por fonte; rodar de novo e conferir que não surge outra. Para só testar a extração:
   `printf '[O Globo] Falhou em 2026-10-25: source-down\n[Cruzada Online] Interrompido por limite de uso da fonte; pendentes: x\n' | grep -oP '^\[\K[^\]]+(?=\] Falhou em)' | sort -u` deve imprimir apenas `O Globo`.
5. Lint e formato: `npm run lint && npm run format:check`.

# Quickstart: validar a viabilidade da fonte

Guia para provar a feature de ponta a ponta. Detalhes de interface em [contracts/probe-cli.md](./contracts/probe-cli.md) e de estruturas em [data-model.md](./data-model.md).

## Pré-requisitos

- Node.js 22 ou superior.
- Conexão com a internet (só para a execução real; os testes não precisam).
- Opcional: copiar `tools/source-probe/.env.example` para `.env` e preencher, se a ferramenta indicar que alguma variável é necessária. Nunca versionar o `.env`.

## Passos

1. Instalar dependências: `cd tools/source-probe && npm ci`.
2. Rodar os testes (sem rede): `npm test`. Esperado: todos passam.
3. Antes do primeiro pedido real, ler os termos de uso da fonte e registrar a conclusão em `decision.md` (tarefa T028). Só seguir se não for "proibido".
4. Rodar a verificação real: `npm run probe -- --save-sample`. Esperado: relatório com veredito e motivo em menos de 2 minutos e, se viável, a amostra sanitizada em `fixtures/`.
5. Consultar uma data específica do nível diário: `npm run probe -- --date 2026-10-01`.
6. Revisar o arquivo em `fixtures/` antes de qualquer commit. Esperado: nenhum token, cookie ou dado pessoal.

## Cenários de validação

| Cenário | Como provar | Resultado esperado |
|---|---|---|
| Acesso anônimo funciona | Passo 4 com a fonte no ar | Veredito `viable`, código de saída 0, resumo do puzzle |
| Fonte exige login | Teste com resposta simulada de acesso negado | Veredito `not-viable-login`, código 1 |
| Fonte fora do ar | Teste com falha de rede simulada | Veredito `inconclusive`, causa `source-down`, código 2 |
| Formato mudou | Teste com resposta que não bate com o schema | `inconclusive`, causa `unexpected-format` |
| Data sem puzzle | Passo 5 com data futura | Caso `unavailable`, sem falha geral |
| Amostra limpa | Passos 4 e 6 | Nenhum token, cookie ou dado pessoal |

## Depois do veredito

Registrar no relatório a recomendação (`proceed` ou `back-to-design`) e, se viável, seguir para a feature 002. Se não viável, voltar ao documento de design para escolher outra fonte.

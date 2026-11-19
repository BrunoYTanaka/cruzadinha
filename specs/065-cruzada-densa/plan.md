# Implementation Plan: Casa com grade densa (estilo O Globo)

**Branch**: `feat/065-cruzada-densa` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/065-cruzada-densa/spec.md`

## Summary

A Casa troca a grade de palavras cruzadas livres por uma grade densa no estilo americano. A cada tentativa, o código monta um desenho de casas pretas simétrico (≤ 25% de pretas, corridas de 3 a 7 letras, tudo ligado) e o preenche com busca com retrocesso sobre uma lista de palavras fixa no repositório. A lista é feita das palavras da lista de frequência FrequencyWords pt_br que o Hunspell pt_BR aceita, menos uma lista de exclusões revisada à mão, com a forma acentuada e uma faixa de frequência por palavra. A grade guarda letras sem acento. A dificuldade escolhe a faixa. Só com a grade pronta o modelo é chamado, uma vez por tentativa, e só para escrever uma dica por resposta numerada. O resto da 064 não muda: limite de 3 chamadas, pulo quieto, `/admin`, visibilidade e atribuição. Não há mudança de banco nem do site. No protótipo (research), 9, 11 e 13 fecharam 5/5 e 15 x 15 fechou 4/5; uma 11 x 11 tem ~45 palavras e ~23% de pretas.

## Technical Context

**Language/Version**: TypeScript 6 strict, Node.js 24

**Primary Dependencies**: as da 064 (Zod, `fetch` nativo); nova `devDependency` da API: `hunspell-asm` 4.0.2 (MIT), usada só pelo script `words:build`, nunca no bundle

**Storage**: nenhuma mudança; lista de palavras como constante gerada em `apps/api/src/sources/generated/words/word-list.data.ts` (~700 KB), carregada por `import()` dinâmico só ao gerar (fica fora do caminho do servidor; confirmar no Context7 como o `tsdown` separa o chunk)

**Testing**: Vitest; preenchimento com lista inventada, desenho fixo e semente fixa (orçamento de nós, sem relógio); um teste com a lista real e semente fixa (sem rede); contrato com resposta real reduzida da DeepSeek; `generated-collect.int.test.ts` adaptado

**Target Platform**: CLI de coleta no GitHub Actions; script de manutenção local

**Project Type**: monorepo web (api + web + shared); mudança só em `apps/api`

**Performance Goals**: preenchimento ≤ 20 s por tentativa (SC-004: ≤ 30 s); ≥ 29/30 datas fechadas por tamanho e dificuldade (SC-003)

**Constraints**: preenchimento nunca gasta chamada; até 2 chamadas por tentativa (dicas e um reparo), cada uma gasta do limite de 3 por dia; testes sem rede; lista reprodutível

**Scale/Scope**: 1 cruzada por dia; ~30 (9 x 9) a ~85 (15 x 15) palavras por grade; lista com ~35 mil palavras

## Constitution Check

| Princípio                  | Situação                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| I. TypeScript estrito      | OK. Script de lista em TypeScript; saída do modelo entra como `unknown` e passa por Zod.                                              |
| II. Qualidade automatizada | OK. Lint, typecheck e testes; o arquivo gerado fica fora do Prettier e do ESLint (dado, não código escrito à mão).                    |
| III. Camadas               | OK. Tudo dentro do adaptador `sources/generated/`; nada em `modules/`.                                                                |
| IV. Adaptadores            | OK. Teste de contrato com uma resposta real do pedido de dicas (research R12), gravada pelo dono com `source:check:generated --save`. |
| V. Lógica pura testada     | OK. Desenho, preenchimento e validação de dicas são puros, com testes. Nenhuma regra de jogo muda.                                    |
| VI. Segurança e segredos   | OK. Sem segredo novo; a chave segue só no cofre. Erros e relatórios sem respostas nem resposta bruta.                                 |
| VII. Testes sem internet   | OK. O script `words:build` baixa as fontes, mas é manutenção sob demanda, fora da suíte e da CI.                                      |
| VIII. Conteúdo             | OK. Cruzadas próprias; a lista derivada da FrequencyWords leva a atribuição e a licença CC BY-SA 4.0 (`words/NOTICE.md`).             |
| IX. Migrações              | OK. Sem mudança de schema; DDE e ERD não mudam.                                                                                       |

Sem violações. Reavaliado após o design: sem mudança.

## Project Structure

### Documentation (this feature)

```text
specs/065-cruzada-densa/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── clue-request.md
│   └── word-list-build.md
└── tasks.md            (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/api/
├── package.json                      # scripts words:build e words:measure; devDependency hunspell-asm
├── .word-sources/                    # git-ignored
└── src/sources/generated/
    ├── words/
    │   ├── build.ts                  # script words:build (tsx, fora do bundle, como check.ts)
    │   ├── measure.ts                # script words:measure: SC-001/003/004, sem modelo
    │   ├── excluded.txt              # curadoria (R4)
    │   ├── word-list.data.ts         # GERADO
    │   ├── word-list.ts              # parse da constante, índice por comprimento/faixa, filtros
    │   └── NOTICE.md                 # atribuição e licenças
    ├── template.ts                   # desenho simétrico (novo)
    ├── fill.ts                       # preenchimento (novo)
    ├── layout.ts                     # mantém seededRandom, seedFrom e toPuzzle; sai o montador livre
    ├── prompt.ts                     # buildCluePrompt (troca buildPrompt)
    ├── schema.ts                     # clueOutputSchema e cleanClues (troca modelOutputSchema/cleanWords)
    ├── client.ts                     # requestClues (mesmo HTTP; muda o tipo da saída)
    ├── generated.ts                  # tentativa: preencher → reserveCall → dicas → toPuzzle; `loadWords` injetável
    ├── check.ts                      # pedido real de dicas para respostas da lista
    ├── fixtures.ts                   # lista inventada + desenho fixo para testes; seed
    └── fixtures/deepseek-response.json  # resposta real do pedido de dicas (reduzida)
apps/api/src/seed/seed-puzzle.ts      # Casa de exemplo densa (lista real, semente fixa, dicas inventadas)
.prettierignore, eslint.config.mjs      # ignorar word-list.data.ts
.gitignore                            # apps/api/.word-sources/
CLAUDE.md                             # linha da Casa (064/065) atualizada
```

**Structure Decision**: tudo no adaptador da Casa em `apps/api`. `shared` e o site não mudam: o formato do puzzle e as validações já aceitam grade densa, e o site já compara letras sem acento.

## Entrega

Uma só release da API (`feat(api)`). O site não muda, e a API anterior e a nova falam o mesmo formato com o site. Cruzadas da Casa já salvas continuam valendo (FR-013).

## Complexity Tracking

Sem violações a justificar.

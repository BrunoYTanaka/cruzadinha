# Research: Casa com grade densa (estilo O Globo)

Protótipo descartável rodado em 2026-11-17 (scratchpad, fora do repositório) para medir a viabilidade antes do plano. Números abaixo vêm dele.

## R1. De onde vêm as palavras

- **Decision**: lista = palavras da lista de frequência [FrequencyWords](https://github.com/hermitdave/FrequencyWords) `content/2018/pt_br/pt_br_50k.txt` (OpenSubtitles 2018, 50 mil formas mais frequentes) que o dicionário Hunspell pt_BR do LibreOffice ([LibreOffice/dictionaries](https://github.com/LibreOffice/dictionaries) `pt_BR/`, projeto VERO) aceita, escritas só em minúsculas `a-z` com acento e cedilha, de 3 a 15 letras sem acento. Formas que viram a mesma grafia sem acento (`e`/`é`) ficam uma só: a mais frequente, e a forma acentuada vai junto para a dica (FR-007). Qualquer forma flexionada entra (clarificação 3).
- **Rationale**: a frequência corta palavras obscuras; o Hunspell corta erros de grafia, gírias escritas errado e boa parte dos nomes próprios. No protótipo: 36 113 palavras (3 letras: 404; 4: 1 483; 5: 3 266; 6: 4 448; 7: 5 754; 8+: o resto).
- **Alternatives considered**: só Hunspell expandido (milhões de formas, a maioria rara: "fazeríeis"); só frequência (entram erros de grafia de legenda); pedir as palavras ao modelo (não fecha grade densa e gasta mais crédito, como a spec registra).

## R2. Licenças e atribuição

- **Decision**: o arquivo gerado traz no cabeçalho a origem com commit fixo de cada fonte e as licenças; `apps/api/src/sources/generated/words/NOTICE.md` repete a atribuição: conteúdo da FrequencyWords sob CC BY-SA 4.0 (o código dela é MIT), dicionário VERO sob LGPLv3/MPL. A lista derivada fica sob CC BY-SA 4.0 (compartilha pela mesma licença). As cruzadas geradas não redistribuem a lista.
- **Rationale**: FR-015. O Hunspell só filtra (nenhuma palavra vem só dele), mas a atribuição custa uma linha e evita dúvida.
- **Alternatives considered**: baixar as fontes na coleta (rede e um ponto de falha a mais, todo dia); lista sem atribuição (viola a CC BY-SA).

## R3. Como a lista é montada e onde fica

- **Decision**: script de manutenção em TypeScript `apps/api/src/sources/generated/words/build.ts` (dentro de `src`, como o `check.ts` da 064: entra no typecheck e no lint, roda com `tsx` e nada o importa, então fica fora do bundle) (`npm run words:build -w @cruzadinha/api`), fora da suíte e da CI: baixa as duas fontes por URL com commit fixo para a pasta ignorada `apps/api/.word-sources/`, usa o Hunspell compilado em WebAssembly (`hunspell-asm` 4.0.2, MIT, `devDependency` da API; no protótipo carrega o pt_BR em 0,3 s e confere as 36 mil palavras em 0,25 s, com o mesmo resultado da `libhunspell` nativa), tira `excluded.txt` e a lista de bloqueio, e grava `apps/api/src/sources/generated/words/word-list.data.ts` (uma constante de texto, uma palavra por linha: `PLAIN\tforma\tfaixa`, ordem de frequência). O arquivo gerado fica fora do Prettier e do ESLint. Consultar a doc do `hunspell-asm` e do `tsdown` no Context7 ao implementar.
- **Rationale**: lista fixa no repositório (spec, Key Entities), reprodutível, sem rede na coleta; TypeScript como o resto (constituição I). Uma constante `.ts` dispensa loader de `.txt` no Vitest e no tsdown. ~700 KB.
- **Alternatives considered**: `nspell` (JavaScript puro: travou mais de 10 min ao carregar o `.aff` do pt_BR no protótipo); Python com `libhunspell` (funciona, mas foge do TypeScript e exige a biblioteca instalada); JSON com contagens (maior e expõe mais do conteúdo CC BY-SA do que o necessário).

## R4. Curadoria (palavras que o Hunspell aceita mas não servem)

- **Decision**: `apps/api/src/sources/generated/words/excluded.txt` (uma palavra sem acento por linha, com comentário `#` opcional) aplicado pelo script. Primeira revisão na implementação: todas as palavras de 3 e 4 letras (1 887) e uma amostra das demais; revisão do dono por amostra. Palavra ruim achada depois (pelo dono ou no descarte do `/admin`) entra no arquivo e o script roda de novo.
- **Rationale**: no protótipo, entre as curtas raras aparecem siglas, nomes e estrangeirismos que o dicionário aceita (`mca`, `jinx`, `kung`, `sins`, `cris`, `lux`, `atm`, `sie`, `moo`). As curtas são as que mais entram numa grade densa, então valem a revisão completa.
- **Alternatives considered**: filtro automático por regra (não separa `lux` de `luz`); só a lista de bloqueio (é para temas impróprios, não para palavras estranhas).

## R5. Faixas de dificuldade

- **Decision**: faixa pela posição na lista de frequência: comum = posição até 15 000, intermediária = até 30 000, rara = o resto (até 50 000). Fácil usa comum; Médio, comum + intermediária; Difícil, todas (FR-006). Se o preenchimento não fechar com a faixa dentro de metade do tempo limite, tenta de novo com a faixa seguinte (caso de borda da spec). Os cortes são ajustados na implementação pela medição de SC-003.
- **Rationale**: no protótipo, Fácil (até 15 000) fechou 5/5 no 9 x 9 e no 11 x 11, mas 0/5 no 15 x 15; com a lista inteira, 15 x 15 fechou 4/5.
- **Alternatives considered**: faixas por tamanho de palavra (não mede dificuldade); pedir ao modelo que avalie cada palavra (gasto).

## R6. Desenho das casas pretas

- **Decision**: desenho montado pelo código a cada tentativa, com semente da data e da tentativa: começa todo branco e põe pares de casas pretas simétricas por meia volta em posições sorteadas, recusando o par que cria corrida de 1 ou 2 casas, até uma proporção sorteada entre 19% e 25% (FR-004); aceita se toda corrida tem de 3 a `MAX_SLOT` letras e as brancas estão ligadas. `MAX_SLOT` = 7 de início (ajustável na implementação para 8 em 13 e 15).
- **Rationale**: no protótipo, sem limite de comprimento o 11 x 11 fechou 1/5; com corridas de no máximo 7 letras, 5/5 com ~45 palavras e 22–23% de pretas. Desenho gerado dá variedade sem manter um catálogo.
- **Alternatives considered**: catálogo de desenhos fixos por tamanho (pouca variedade, curadoria manual); corridas longas como no O Globo (o O Globo tem ~32 palavras no 11 x 11 porque usa palavras longas; com o vocabulário disponível isso não fecha com folga).

## R7. Preenchimento

- **Decision**: busca com retrocesso pura em `sources/generated/fill.ts`: índice por comprimento e (posição, letra); escolhe sempre a corrida vazia com menos candidatas (MRV), testa as candidatas em ordem de frequência com ruído da semente (no máximo 60 por corrida), e depois de cada escolha confere que toda corrida cruzada ainda tem candidata (forward checking). Sem repetição de resposta na cruzada (FR-008). Orçamento de nós por desenho; esgotado, troca de desenho; tempo total limitado a 20 s por tentativa por um `Clock` injetado. Os testes usam lista inventada pequena, semente fixa e só o orçamento de nós (determinístico).
- **Rationale**: no protótipo, sem otimização (candidatas recalculadas a cada nó): 9 x 9 em ~2 s, 11 x 11 em ~0,7–2,5 s, 13 x 13 em ~3 s, 15 x 15 em ~13 s (máx. 22 s). Na implementação, conjuntos de bits por (posição, letra) e cache de candidatas por corrida devem baixar isso bastante; SC-004 limita a 30 s.
- **Alternatives considered**: solver SAT/CSP genérico (dependência pesada para um problema pequeno); preencher por linha em ordem fixa (muito retrocesso).

## R8. Pedido de dicas ao modelo

- **Decision**: `buildCluePrompt({ answers, difficulty })` manda as respostas numeradas na forma acentuada e pede `{"clues":[{"n":1,"clue":"…"}]}` (contrato em `contracts/clue-request.md`). Validação: um item por número, sem faltar nem sobrar; cada dica com as regras da 064 (3 a 120 caracteres, só texto, sem a resposta sem acento, sem termo bloqueado). Qualquer falha descarta a tentativa (FR-010); a próxima preenche outra grade com outra semente.
- **Rationale**: número em vez de repetir a resposta evita que o modelo "corrija" a palavra. Saída: 11 x 11 ~45 dicas, 15 x 15 ~85 dicas, contra 64 e 80 palavras com dica na 064; entrada menor (sem a lista de 30 dias).
- **Reparo (clarificações 2026-11-19)**: dica faltando ou inválida não derruba a tentativa de imediato. Na resposta real, a dica de "tragam" repetiu a palavra três vezes, mesmo com aviso no reparo: verbo conjugado quase não tem dica sem citar o verbo. Por isso o reparo troca a palavra: `refillRegion` (em `fill.ts`) solta a palavra e as que a cruzam, com o resto travado, e preenche só a região (até 4 níveis; 84–100% de sucesso medido, ~7–10 palavras trocadas). Só as palavras novas vão ao modelo, numa chamada ~10% do tamanho da primeira, que gasta uma das 3 do dia. Sem região possível, repete o pedido das mesmas palavras com aviso.
- **Alternatives considered**: reparo fora do limite de 3 (tira o teto de gasto); dica citando o infinitivo ("Imperativo plural de trazer"; recusada pelo dono); filtrar verbos conjugados na lista (sem analisador morfológico, a heurística pelo `.dic` tirava 20 mil palavras, inclusive substantivos como "panda" e "piloto"); preencher a grade toda de novo (troca as 85 palavras e pede todas as dicas outra vez).

## R9. Ordem da tentativa e limite de chamadas

- **Decision**: em cada uma das até 3 tentativas: preencher a grade (sem crédito); se não fechar no tempo, a tentativa falha com o detalhe `grade não preenchida` (no lugar do `palavras insuficientes` da 064), sem reservar chamada; se fechar, `reserveCall` e pedido de dicas. Pulo quieto, "sem créditos", "sem chave" e "geração desligada" iguais à 064.
- **Rationale**: FR-009 e FR-011: o preenchimento nunca gasta chamada.

## R10. Respostas dos últimos 30 dias

- **Decision**: `recentAnswers` continua como na 064; o adaptador passa por `plain` e tira da lista de palavras só as de 5 letras ou mais (clarificação 4). Nada vai no pedido ao modelo.
- **Rationale**: FR-008; menos tokens de entrada.

## R11. Letras sem acento na grade

- **Decision**: a solução guarda a forma sem acento (`PLAIN`); o `/admin` mostra a resposta como está na solução (sem acento). Cruzadas da Casa antigas, com acento, continuam iguais (FR-013).
- **Rationale**: clarificação 1. O site já compara com `plainLetter`, então digitar com ou sem acento funciona nas duas.

## R12. Fixture real do contrato (constituição IV)

- **Decision**: `source:check:generated` passa a sortear respostas da lista (sem precisar do preenchimento) e pedir as dicas reais; com `--save`, grava a resposta em `.source-samples/`. Uma resposta real reduzida (~20 dicas, sem `id` nem `usage`) substitui `fixtures/deepseek-response.json`. O dono roda o comando com a própria chave (a chave fica só no cofre; FR-014 da 064).
- **Rationale**: o princípio IV exige resposta real do fornecedor nos testes de contrato.

## Medição final (T034, `npm run words:measure`, lista com curadoria de 35 508 palavras, `maxSlot` 7, 4000 nós por desenho)

Todas as 12 combinações fecharam 30/30 datas, sem alargar `maxSlot` nem mexer nos cortes de faixa (R5 a R7 valem como escritos). Pretas em 22–24%.

| Lado | Fácil: palavras (média/mín) · tempo (média/máx) | Médio | Difícil |
| ---- | ----------------------------------------------- | ----- | ------- |
| 9    | 30,4/30 · 0,1 s/0,2 s                           | 30,9/30 · 0,1/0,2 s | 30,7/30 · 0,1/0,2 s |
| 11   | 44,2/42 · 0,2 s/0,8 s                           | 44,2/42 · 0,1/0,3 s | 43,8/42 · 0,1/0,3 s |
| 13   | 63,9/54 · 2,0 s/7,2 s                           | 62,6/56 · 0,5/1,7 s | 62,1/52 · 0,3/1,1 s |
| 15   | 84,0/80 · 5,3 s/11,5 s                          | 82,6/74 · 2,1/8,7 s | 82,3/76 · 1,2/3,7 s |

SC-001 (≥ 28 palavras no 11 x 11): 42 no pior caso. SC-003 (≥ 29/30): 30/30. SC-004 (≤ 30 s): 11,5 s no pior caso.

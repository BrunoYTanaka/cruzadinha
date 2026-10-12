# Research: Formato interno de puzzle e adaptador O Globo

Documentação consultada via Context7 em 2026-10-12: Zod 4.6 (`/colinhacks/zod/v4.6.5`: `superRefine`/`ctx.addIssue` com `path`, `z.iso.date()`) e Vitest 5.0 (`/vitest-dev/vitest/v5.0.3`: `vi.fn`, `vi.spyOn(globalThis, 'fetch')`, `vi.useFakeTimers`). Nenhuma dependência nova: tudo usa Zod 4.6, Vitest 5.0, tsx 4 e APIs nativas do Node 24 (`fetch`, `AbortSignal.timeout`, `node:crypto`).

## Decisões

### 1. Onde vive cada parte
- **Decision**: o formato interno (schemas Zod, tipos e as funções de validação de FR-003 e FR-004) fica em `packages/shared/src/puzzle/`. A interface `PuzzleSource`, o tipo de resultado e o adaptador ficam em `apps/api/src/sources/`, com o O Globo numa pasta própria (`sources/oglobo/`).
- **Rationale**: o princípio I manda tipos e schemas comuns para o `shared`; o site vai precisar do tipo do puzzle público na feature do jogo. A interface e o resultado da busca são só do servidor (o site nunca chama a fonte), então ficam no `api`. O design previa `sources/oglobo.ts` como arquivo único; a pasta separa conversão pura, acesso HTTP, schema da resposta e fixtures, cada um testável sozinho, sem mudar a fronteira do princípio IV.
- **Alternatives considered**: interface `PuzzleSource` no `shared` (exporia ao site um conceito que ele não usa); adaptador num pacote próprio (quarto workspace sem necessidade).

### 2. Solução separada da parte pública
- **Decision**: dois schemas independentes, `puzzleSchema` (público, sem letras) e `solutionSchema` (matriz de letras, `null` nos blocos). O par é validado por `validatePuzzleWithSolution`. O formato público não tem nenhum campo onde caiba uma letra da resposta.
- **Rationale**: atende FR-002 e o princípio VI pela forma dos dados, não por disciplina de quem serializa. A futura tabela `puzzles` já prevê colunas separadas `data` e `solution`.
- **Alternatives considered**: um objeto só com a solução marcada como privada e um `omit` na hora de responder (um esquecimento vaza a resposta).

### 3. Validação estrutural com `superRefine`
- **Decision**: os schemas Zod validam a forma (tipos, intervalos, `z.iso.date()` para datas, enum de níveis). As regras de FR-003 (palavra dentro da grade e sem bloco, tamanho igual à sequência de células abertas, dica não vazia, número único por direção, toda célula aberta em alguma palavra) e de FR-004 entram como `superRefine` no objeto, com `ctx.addIssue({ code: 'custom', path: [...] })` apontando a palavra ou célula problemática.
- **Rationale**: um único `safeParse` devolve todos os problemas com caminho, o que dá o "motivo claro" pedido na história 1. A documentação do Zod 4.6 confirma `superRefine` com `path` e `z.iso.date()` rejeitando dias inválidos (`2020-01-32`).
- **Alternatives considered**: funções de validação soltas, fora do schema (o tipo inferido não carregaria a garantia; quem recebe um `Puzzle` teria de lembrar de chamar a função).

### 4. Palavras derivadas da grade ipuz, não do `fromIpuz`
- **Decision**: o conversor lê só `ipuzData`. As palavras são as sequências horizontais e verticais de 2 ou mais células abertas na grade `puzzle`; o número de cada uma é o número da célula inicial; a dica vem de `clues.Across`/`clues.Down` pelo número; as letras vêm de `solution`. `fromIpuz` é validado como presente (para detectar mudança de formato) mas não é usado na conversão.
- **Rationale**: o ipuz é um padrão aberto e auto-suficiente; derivar dele mantém o conversor reaproveitável por outras fontes ipuz e evita duas fontes da verdade. A derivação também confere a numeração: sequência sem número, número sem sequência ou dica sem palavra viram `unexpected-format`.
- **Alternatives considered**: usar `fromIpuz` (formato próprio da Agilmente, sem especificação pública); cruzar os dois e recusar divergências (mais código para um ganho só teórico; pode ser acrescentado se a verificação real mostrar divergência).

### 5. Recursos do ipuz fora do suporte
- **Decision**: o conversor respeita os campos `block` (padrão `#`) e `empty` (padrão `0`) do próprio ipuz; a amostra da 001 usa `:` como vazio. Viram `unsupported`: célula da grade como objeto (estilos, círculos), célula ausente ou `null` (grade não retangular), célula da solução com mais de um caractere (rebus), dica em formato diferente do par `[número, texto]` e `kind` diferente de crossword.
- **Rationale**: FR-010 separa "formato inesperado" (algo quebrou) de "não suportado" (válido, mas o jogo ainda não sabe mostrar). Recusar é melhor que entregar um puzzle errado (edge cases da spec).
- **Alternatives considered**: ignorar estilos e aceitar a célula (círculos costumam carregar significado no puzzle).

### 6. Texto das dicas e letras
- **Decision**: a dica é copiada exatamente como veio, sem decodificar entidades nem remover tags (clarificação de 2026-10-12); só se recusa dica vazia ou só com espaços. As letras da solução passam por `toLocaleUpperCase('pt-BR')`, mantendo acentos.
- **Rationale**: decisão do autor na sessão de clarificação; a comparação de letras com e sem acento é da feature `game-logic`.

### 7. Interface `PuzzleSource` e resultado
- **Decision**: `PuzzleSource` tem `id` (`'oglobo'`) e `fetchPuzzle(level, date): Promise<FetchPuzzleResult>`. O resultado é uma união discriminada por `ok`: sucesso com `puzzle`, `solution` e `dates`; falha com `reason` (os seis motivos de FR-010) e `detail` opcional, um texto curto sem dados da resposta (por exemplo, o caminho do campo que falhou). O adaptador nunca lança exceção para falhas da fonte; só lança para nível ou data inválidos, que são erro de quem chama (validados antes de qualquer pedido).
- **Rationale**: o serviço de puzzles da feature seguinte trata cada motivo de um jeito (502, 404, parar a coleta) sem conhecer HTTP nem a Agilmente. Resultado explícito em vez de exceção deixa o `switch` exaustivo checado pelo TypeScript.
- **Alternatives considered**: exceções tipadas (fácil esquecer um `catch`; tipos de erro não aparecem na assinatura).

### 8. Mapeamento das respostas da fonte

| Situação | Motivo |
|---|---|
| Corpo `{"error":"NO-USER"}` (com qualquer status) ou HTTP 401/403 | `refused` após uma nova tentativa com token novo |
| HTTP 429 | `rate-limited`, sem nova tentativa |
| HTTP 5xx, falha de rede, tempo limite de 10 s (`AbortSignal.timeout`) | `source-down`, sem nova tentativa |
| Corpo com `"error": "NOT-AVAILABLE"` (mesmo com o resto da resposta), HTTP 404, ou a data pedida aparece em `dates` com `inTheFuture: true` | `unavailable` |
| Corpo que não é JSON, outro valor em `error`, outro status 4xx, ou corpo fora do schema | `unexpected-format` |
| Corpo válido com recurso fora do suporte (decisão 5) | `unsupported` |

- **Rationale**: segue `decision.md` (recusa detectada pelo corpo) e o design (parar ao limite de uso). A data futura é decidida pela marcação da própria fonte, sem depender do relógio do servidor. Observado pelo autor em 2026-10-12: data mal formada (por exemplo `2026-13-01`) recebe o corpo completo (`dates`, `ipuzData` etc.) acrescido de `"error": "NOT-AVAILABLE"`, e pedido sem data recebe HTTP 502. Como o corpo com `NOT-AVAILABLE` traz um `ipuzData` que não é da data pedida, o campo `error` é conferido antes de qualquer conversão. Falta confirmar se uma data bem formada sem puzzle (fora da janela de cerca de 30 dias) responde da mesma forma; a verificação sob demanda registra isso, e o mapeamento é ajustado com uma fixture nova se divergir.
- **Alternatives considered**: comparar a data com o relógio local (fuso e virada do dia viram fonte de erro; a fonte já marca).

### 9. Token anônimo
- **Decision**: `ANONYMOUS-${randomBytes(16).toString('hex')}-ANONYMOUS` com `node:crypto`, gerado na primeira chamada e guardado só na instância do adaptador. Em `refused`, gera outro e tenta uma única vez. O gerador é injetável para os testes.
- **Rationale**: formato de `decision.md`; 16 bytes dão os 32 hexadecimais. Nunca sai da instância: não entra em resultado, `detail`, log nem fixture (FR-013).

### 10. Testes sem rede
- **Decision**: o adaptador recebe por injeção uma função `fetch` (padrão: o `fetch` global) e um gerador de token. Os testes passam um `vi.fn()` que devolve `new Response(...)` com o conteúdo das fixtures, conferindo cabeçalhos e número de chamadas. O conversor é puro e testado direto com o JSON das fixtures. O tempo limite é testado com um `fetch` que rejeita com `TimeoutError`, sem esperar 10 s.
- **Rationale**: injeção é mais explícita que `vi.stubGlobal`/`vi.spyOn(globalThis, 'fetch')` e não vaza entre testes. Cumpre FR-014, SC-003 e o princípio VII.

### 11. Fixtures
- **Decision**: JSON em `apps/api/src/sources/oglobo/fixtures/`. A fixture válida do nível diário é uma resposta real reduzida a uma grade de 5 x 5 com blocos, mantendo todos os campos e tipos da resposta, com letras e dicas trocadas por conteúdo inventado e `dates` cortada a poucas entradas. As de falha (recusa, campo renomeado, célula como objeto, rebus) são cópias da válida com uma alteração cada; os testes também geram variações em código a partir da válida. Respostas brutas gravadas pela verificação sob demanda vão para `apps/api/.source-samples/`, ignorado pelo git, e são reduzidas à mão antes de virar fixture.
- **Rationale**: repositório público (decisão da 002, FR-015): a fixture preserva a estrutura que o teste de contrato precisa (SC-005), sem redistribuir um puzzle. A amostra da 001 não foi versionada, então a primeira fixture real sai da verificação sob demanda, permitida durante o desenvolvimento (clarificação de 2026-10-12).
- **Alternatives considered**: fixture escrita só a partir de `decision.md`, sem resposta real (não pegaria campos ou tipos que a descrição omitiu).

### 12. Verificação sob demanda
- **Decision**: script `apps/api/src/sources/oglobo/check.ts`, rodado com `npm run source:check -w @cruzadinha/api -- [AAAA-MM-DD] [--save]`, usando o próprio adaptador. Data padrão: hoje no fuso `America/Sao_Paulo`. Consulta os cinco níveis em sequência, com 2 s de pausa, e para no primeiro `rate-limited`. Imprime uma linha por nível (`daily  ok  11x11  32 palavras` ou `mini  unavailable`) e, ao parar, os níveis não consultados. Com `--save`, grava cada resposta bruta em `.source-samples/` e informa se alguma dica tem `<` ou `&`, para conferência manual. Não é `*.test.ts`, então o Vitest não o executa; também não entra no bundle (o tsdown só empacota `server.ts`).
- **Rationale**: FR-017 e SC-006; reaproveitar o adaptador testa o caminho real. A conferência de marcação no `--save` é só informativa, sem mudar a conversão (clarificação de 2026-10-12).
- **Alternatives considered**: teste Vitest com flag de ambiente (fácil rodar sem querer na CI); comando no futuro `cli.ts` (não existe ainda; a feature de puzzles pode movê-lo para lá).

### 13. Termos de uso
- **Decision**: nenhuma tarefa de leitura dos termos nesta feature.
- **Rationale**: a emenda 2.0.0 da constitution retirou do princípio VIII a obrigação de respeitar os termos de uso; a leitura deixou de ser condição de feature (decisão do autor em 2026-10-12).

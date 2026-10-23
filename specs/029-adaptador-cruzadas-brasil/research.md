# Research: Adaptador da fonte Cruzadas Brasil

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-23

Nenhuma biblioteca nova entra; Zod 4, Drizzle (`check()`), Vitest e as demais seguem nas versões e APIs das features 003 a 027. Na implementação, toda chamada nova a elas passa de novo pelo Context7 (constitution, Fluxo de Desenvolvimento).

As observações abaixo vêm de pedidos manuais de leitura (um por vez, com pausa) a páginas públicas, feitos em 2026-10-23, e não substituem a verificação sob demanda. Nenhum conteúdo foi guardado no repositório.

## R1. Como ler a página sem dependência nova

**Decision**: tratar o HTML como texto. Cada `self.__next_f.push([1,"..."])` é lido com `JSON.parse` do literal de string (desfaz o escape corretamente), os trechos são concatenados e o objeto depois de `"dadosJogo":` é extraído por contagem de chaves com reconhecimento de strings, e então vai a `JSON.parse` e ao schema Zod. Nada do HTML é executado.

**Rationale**: um parser de HTML completo (jsdom, cheerio) pesaria no bundle da API para ler um único objeto, e a grade renderizada é derivada dos mesmos dados. Um regex de unescape simples (`\\"` → `"`) quebra com barras e aspas dentro das dicas.

**Alternatives considered**: ler a grade e as dicas do HTML renderizado (frágil, depende de classes CSS); `fast-xml-parser`/HTML parser (dependência sem ganho); pedir um endpoint JSON à fonte (decisão do autor, fica em `findings.md`).

## R2. Formato dos dados do jogo

**Observado (22/10/2026, 13 x 8)**: objeto com `id` ("20261022", igual à data), `titulo`, `nivel` ("Diário"), `dimensoes` (`linhas: 13`, `colunas: 8`), `dicas` (`horizontais` e `verticais`, listas de `{numero, dica}`), `posicoes_num` (lista de `{numero, x, y}` com `x` = coluna e `y` = linha, base 0) e `gabarito` (13 linhas de 8 células, letra maiúscula ou `#` para bloco).

**Conferido por script descartável**: aplicando a numeração clássica à grade (célula branca que começa palavra horizontal ou vertical de 2+ letras, em ordem de leitura), os números calculados são 28, os horizontais (13) e verticais (20) batem com as dicas e as posições batem com `posicoes_num`. Em 2026-07-13 a grade era 11 x 11 (mesmo formato).

**Decision**: o schema Zod exige `id`, `nivel`, `dimensoes`, `dicas`, `posicoes_num` e `gabarito`; `titulo` é opcional. Campos desconhecidos são ignorados (objeto tolerante), já que a fonte pode acrescentar campos. A conversão calcula tudo da grade, e `posicoes_num`/`dicas`/`gabarito` servem de conferência (qualquer divergência → `unexpected-format`).

**Rationale**: calcular da grade, em vez de confiar na lista de posições, evita puzzle inválido por dado inconsistente da fonte e é o que o critério de aceitação pede.

## R3. Status, histórico e páginas anômalas

| Data | Resposta | Tratamento |
|------|----------|------------|
| 2026-10-22, 10-21, 10-23 (hoje) | 200 com dados | `ok` |
| 2026-10-24 (futuro) | 200, título "Em breve", sem dados | nunca pedido (futuro); se chegar, `unexpected-format` |
| 2026-01-01, 2025-01-01, 2026-07-12 | 404 | `unavailable` |
| 2026-08-01 | 200 com dados (a leitura simples do HTML não achava o marcador; o payload vem em vários trechos, e a concatenação dos trechos o encontra) | `ok` |

O `sitemap.xml` lista 103 datas, de 2026-07-13 a 2026-10-23, e não lista as datas futuras. O primeiro dia da fonte (2026-07-13) é o corte real do histórico; a janela da coleta (31 dias) é só um teto.

**Decision**: 404 → `unavailable`; 200 sem payload → `unexpected-format` com detalhe curto ("dados do jogo ausentes"); 429 → `rate-limited`; 5xx/rede/tempo → `source-down`; 403 (bloqueio ou desafio da Cloudflare) → `source-down`; outro 4xx → `unexpected-format`. A data lida (`id`) precisa coincidir com a pedida (página de outra data, ou redirecionamento, é recusada).

**Risco aberto**: a fonte fica atrás da Cloudflare e o IP do Render (datacenter) pode ser tratado diferente do IP local. Os pedidos manuais acima saíram de uma máquina local. Por isso o 403 é `source-down` (não parece mudança de formato) e a coleta precisa ser conferida uma vez no ambiente publicado (FR-019, T033).

**Rationale**: `collect()` já trata `unavailable` como não-erro e `unexpected-format` como falha registrada que não interrompe a fonte.

## R4. Texto, acentos e UTF-8

A resposta declara `content-type: text/html; charset=utf-8`. As dicas têm acentos (por exemplo "incômodo"); o gabarito observado é ASCII maiúsculo, mas o schema aceita qualquer letra maiúscula Unicode.

**Decision**: ler `response.arrayBuffer()` e decodificar com `new TextDecoder('utf-8', { fatal: true })`, sem depender do `charset` do cabeçalho; byte inválido → `unexpected-format`. Letras com `toLocaleUpperCase('pt-BR')` e normalização NFC; dicas limpas por `clueText` (entidades HTML, espaços repetidos, pontas aparadas, vazio → erro). Fixture com "AÇÃO"/"CORAÇÃO" nas dicas e no gabarito cobre o requisito.

**Alternatives considered**: `response.text()` (já UTF-8 por padrão no `fetch`, mas sem erro em byte inválido; o `fatal` torna a falha explícita).

## R5. Segurança da leitura

O HTML é dado externo. **Decision**: limite de 1 MB no corpo (a página real tem ~45 kB) conferido por `content-length` e pelo tamanho lido; nenhum trecho é avaliado como código (só `JSON.parse`); `JSON.parse` falho → `unexpected-format`; nada do corpo vai a log ou detalhe (só coordenadas e ids, como em 014/FR-010). Entidades HTML das dicas decodificadas por uma tabela mínima (`&amp; &lt; &gt; &quot; &#39; &nbsp;` e numéricas); nome desconhecido → `unexpected-format`.

## R6. Site com três fontes

`puzzleSourceIdSchema.options` alimenta `useSourceLibraries`, `SourceTabs`, `TodayCards`, o seletor de fonte padrão (`SourcePicker`, até 3), `DayRoute` e `GamePage`. O grid do seletor e as abas foram desenhados para 1 a 3 (features 015 e 024). **Decision**: nenhuma mudança de componente esperada; validar por teste de componente (três fontes) e e2e a 360 px e desktop (SC-009), e corrigir só o que quebrar. O nome "Cruzadas Brasil" é o mais longo; é o caso de teste de truncamento nas abas.

## R7. Compatibilidade

`puzzleSourceQuerySchema` mantém `oglobo` como padrão. Respostas já são tolerantes (feature 012): um site antigo que recebe um item com `source: 'cruzadasbrasil'` só pode quebrar se validar a fonte de forma estrita. **Decision**: a biblioteca filtra por fonte pedida, então o site antigo nunca recebe item da fonte nova (pedidos sem fonte, `oglobo` ou `cruzadaonline`); `GET /api/puzzles/:id` com id de puzzle da nova fonte só é pedido pelo site novo. Teste de integração cobre o pedido sem fonte com três fontes salvas (SC-007). Configuração antiga com fonte desconhecida segue lida como a primeira (settings, feature 021).

## R8. Coleta

Sem lista de datas na fonte, `collect()` percorre as `COLLECT_HISTORY_DAYS` datas e pede cada uma que falta; as anteriores a 2026-07-13 voltam 404 (`unavailable`) com a pausa de 2 s, uma vez só por execução e por data, sem salvar. **Decision**: sem mudança no serviço; o relatório da fonte lista `unavailable`. Se o custo de 404 repetidos incomodar (janela de 365 dias, ~12 min por execução), tratar em feature própria (guardar o primeiro dia disponível), fora do escopo.

## R9. Seed e exemplo

`seed-puzzle.ts` escolhe o conversor por fonte. **Decision**: trocar o `if` por um `switch` exaustivo (o TypeScript acusa fonte sem exemplo) e usar a fixture 5 x 5 do novo adaptador.

# Research: Build do site e e2e sem avisos

Medições feitas em 2026-10-23 com `npm run build -w @cruzadinha/web` (Vite 8.3.4, Rolldown) numa árvore limpa.

## 1. Import sem extensão na configuração

**Observado**: o aviso aponta `vite.config.ts:4:35`, o import de `./version-plugin`. É o único import relativo do arquivo.

**Decision**: escrever `./version-plugin.ts` e habilitar `allowImportingTsExtensions` em `tsconfig.node.json` (que já herda `noEmit: true` do `tsconfig.base.json`, condição exigida pela opção).

**Rationale**: é a causa do aviso; não depende de `VITE_CONFIG_NATIVE_IGNORE_WARNING`. O carregador nativo roda a configuração direto no Node 24, que lê `.ts` com remoção de tipos, então exige a extensão.

**Alternatives**: silenciar pela variável (proibido pela issue e pelo FR-002); renomear o plugin para `.js` (perde tipos).

**Verificar na implementação**: o build com `--configLoader native` explícito, e se `version-plugin.ts` usa só sintaxe que o Node remove (sem `enum` nem parâmetros de propriedade). O arquivo atual usa só `import type`.

## 2. Erro do git no container

**Observado**: `siteVersionPlugin` chama `readGitHead()` sempre, mesmo quando `GITHUB_SHA` existe (o `||` em `siteVersionJson` só ignora o resultado). No container, o git recusa o diretório e escreve `fatal: detected dubious ownership` no stderr, que o processo filho herda. O `catch` esconde a exceção, mas não o stderr. Com `GITHUB_SHA` definido o commit já sai certo, então só o log está sujo; não há perda de commit no CI.

**Decision**: chamar o git só quando `GITHUB_SHA` falta, e abrir o filho com `stdio: ['ignore', 'pipe', 'ignore']`.

**Rationale**: elimina a mensagem na origem para os dois casos (CI com `GITHUB_SHA`; ambiente sem git ou com dono diferente), mantém o HEAD local e "desconhecido" como último recurso. Não toca no workflow nem muda a configuração global do git do runner.

**Alternatives**: `git config --global --add safe.directory "$GITHUB_WORKSPACE"` no workflow (resolve só o CI, deixa o ruído em qualquer outro container, e muda configuração do runner); manter o erro e filtrar o log (esconde em vez de corrigir).

**Teste**: `siteVersionJson` passa a receber a função de leitura (`readGitHead`, exportada) em vez do valor, para testar (a) `GITHUB_SHA` presente e leitor nunca chamado, (b) leitor devolvendo `undefined`, (c) leitor chamado só sem `GITHUB_SHA`, (d) `GITHUB_SHA` vazio, e (e) o `readGitHead` real fora de um repositório sem nada no stderr.

## 3. Chunks acima de 500 kB

**Observado**: só o chunk `index` passa do limite: 519,11 kB (160,86 kB gzip). `GamePage` (46,5 kB) já é carregado sob demanda pelo `lazy` do router. Peso do `index` por pacote, medido pelo tamanho do código-fonte no source map (ordem de grandeza, antes da minificação):

| Pacote | Fonte |
|---|---|
| react-dom | 620 kB |
| react-router | 367 kB |
| zod | 362 kB |
| código do app (`src`) | 175 kB |
| @tanstack/query-core | 156 kB |
| @tanstack/react-query, react, idb, scheduler | 69 kB |

O estouro é de uns 19 kB sobre o limite. O peso é de bibliotecas que a primeira tela precisa, não de uma tela evitável.

**Decision**: dividir com `build.rolldownOptions.output.codeSplitting.groups`: um grupo `react` (`react`, `react-dom`, `scheduler`) e um `vendor` com o restante de `node_modules`. O código do app fica no chunk de entrada. O limite do aviso não sobe.

**Rationale**: cada chunk fica abaixo de 500 kB; o total baixado na primeira visita é o mesmo, em pedidos paralelos (HTTP/2 na Cloudflare); e o vendor passa a ter nome de arquivo estável entre releases do site que só mudam o app, o que melhora o cache nas visitas seguintes. Atende FR-008 (não baixa mais código) e FR-005.

**Alternatives**:

- Elevar `chunkSizeWarningLimit`: esconde o sintoma e o próximo crescimento do app; só se a divisão falhar.
- `import()` de `/login`, `/cadastro` e do diálogo de ajustes: reduz o carregamento inicial de verdade, mas essas telas são pequenas (a maior parte dos 175 kB de `src` é o app todo), então sozinho não tira o chunk do aviso. Fica como passo opcional: só entra se a medição depois da divisão mostrar ganho de pelo menos 10 kB gzip na rota inicial; caso contrário fica fora (FR-007: não mexer no carregamento de rotas sem necessidade).
- Remover o Zod do navegador: fora de escopo (os schemas de `shared` são o contrato).

**Riscos e verificação**:

- Ordem do CSS e `@layer` (feature 023): a divisão é só de JavaScript; conferir que `dist/index.html` continua com o mesmo `<link rel="stylesheet">` e que `e2e/botoes.spec.ts` passa.
- `reload-after-deploy.ts`: os nomes dos chunks de vendor mudam a cada release que muda dependências; o caso é o mesmo do `GamePage` e continua coberto, mas o teste unitário do arquivo deve passar sem mudança.
- Conferir que o `index.html` ganha `modulepreload` para o chunk de vendor (Vite faz isso para imports estáticos), para não criar uma cascata de pedidos.
- Medir antes e depois: soma do gzip dos JS carregados na rota `/` (hoje 160,86 kB) e número de pedidos.

## 4. Validação no container do e2e

Os três avisos só se confirmam no job `e2e` da CI (três fatias). A saída do `[WebServer]` de cada fatia é lida no log; o `version.json` do build no job traz o `GITHUB_SHA`.

## 5. APIs confirmadas no Context7 (T001)

- Vite 8 (`/vitejs/vite` v8.0.10): `--configLoader native` usa o runtime do ambiente; `build.rolldownOptions` é mesclado com a configuração interna e segue o formato do Rolldown; `manualChunks` (forma objeto) foi removido e a forma função está obsoleta em favor de `codeSplitting`.
- Rolldown (`/rolldown/rolldown`): `output.codeSplitting.groups` é uma lista de `{ name, test, priority }`; o grupo de maior `priority` reivindica o módulo primeiro (os demais perdem esse módulo), e `includeDependenciesRecursively` é `true` por padrão (reduz chunks circulares). Daí o grupo `react` com prioridade maior que o `vendor`.
- `allowImportingTsExtensions` (TypeScript) exige `noEmit` (ou `emitDeclarationOnly`), já ativo no `tsconfig.base.json`.

## 6. Linha de base (T001)

Build de 2026-10-23 antes das edições: `index` 519,11 kB (160,86 kB gzip), `GamePage` 46,46 kB (15,91 kB gzip), CSS `index` 22,73 kB (5,70 kB gzip), `GamePage` CSS 12,37 kB (3,25 kB gzip). JS carregado em `/`: 1 arquivo, 160,86 kB gzip.

## 7. Resultado (T009 a T012)

Build de 2026-10-23 com os grupos `react` (prioridade 20) e `vendor` (prioridade 10):

| Arquivo | Tamanho | Gzip |
|---|---|---|
| `index` (app) | 71,52 kB | 24,11 kB |
| `react` | 218,76 kB | 68,26 kB |
| `vendor` | 228,33 kB | 68,75 kB |
| `rolldown-runtime` | 0,58 kB | 0,36 kB |
| `GamePage` (sob demanda) | 46,56 kB | 15,94 kB |

- Nenhum aviso no build; nenhum `.js` acima de 500 kB; o limite do aviso não foi alterado.
- JS carregado em `/`: 161,48 kB gzip em 4 arquivos (antes 160,86 kB em 1), ou seja, +0,62 kB (dentro da tolerância de 1 kB do T010). `index.html` ganhou `modulepreload` para `rolldown-runtime`, `react` e `vendor`, então os 4 arquivos são pedidos em paralelo. O CSS é o mesmo (`index-CvTQdnfV.css`, mesmo hash).
- T011 (lazy de `/login`, `/cadastro` e ajustes): fora. O chunk do app inteiro tem 24,11 kB gzip, então essas telas não chegam perto dos 10 kB gzip exigidos; mexer em `router.tsx` não se justifica.
- `reload-after-deploy`: um chunk de vendor ausente após um deploy segue o mesmo mecanismo do `GamePage` e é coberto pelo teste unitário existente; nenhum teste novo.
- Testes: 812 unitários passam (6 ignorados, como antes) e os 132 e2e passam (Postgres 17 descartável, API em outra porta, `vite preview` na 4174). `format:check`, `lint` e `typecheck` passam.
- Sem git: `readGitHead` fora de um repositório devolve `undefined` e não escreve nada no stderr (teste automático e execução à mão, `commit: "desconhecido"`). Com `GITHUB_SHA=abc123` o `version.json` traz `abc123`. O build com `--configLoader native` explícito termina sem aviso.

# Cruzadinha: design

Data: 2026-10-12
Status: revisado após a feature 001 (fonte viável)

## 1. Objetivo

Um site de palavras cruzadas que reúne puzzles de sites existentes numa interface limpa e fácil de usar. Cada site de origem tem uma UI/UX própria que o autor considera ruim, e este projeto entrega uma experiência única de jogo.

- **Uso:** projeto de portfólio, site pequeno e privado, para o autor e amigos.
- **Foco:** a experiência de jogar (tabuleiro, teclado, dicas, navegação) e a qualidade do código.
- **Sucesso:** o usuário entra, escolhe uma data do O Globo, joga numa interface agradável em claro ou escuro, e o progresso fica salvo entre dispositivos.

### Fora do escopo da v1

Verificar e revelar letras ou palavras, estatísticas, streaks, ranking entre amigos, temas visuais extras e outras fontes (Cruzadas Clube, G1, Coquetel). A arquitetura deixa esses itens como extensões, sem reescrita.

## 2. Fonte de puzzles

A v1 usa só o **O Globo**. O jogo do O Globo é um widget da fornecedora **Agilmente**, que consome:

- Base: `https://oglobo-api.agilmenteapp.com/api/`
- Rota: `games/crossword/{nível}/{YYYY-MM-DD}`
- Nível: só `daily`. O código do widget também cita `mini`, `express`, `expert` e `thematic`, mas a fonte não os publica (respondem `NOT-AVAILABLE`).
- A resposta lista também as datas disponíveis (`dates`, cada uma com `inTheFuture` e `status`), o que permite navegar pelo histórico.
- Formato: o puzzle vem no padrão aberto **ipuz v2** (`ipuzData`: grade, solução e dicas `Across`/`Down`), mais `fromIpuz` com a resposta e a posição de cada palavra.
- Autenticação: header `x-access-token` com um token anônimo no formato `ANONYMOUS-<32 hexadecimais>-ANONYMOUS`. O servidor aceita qualquer valor nesse formato, então o token é gerado localmente; ele identifica o visitante, não o autentica. A `x-key` não foi necessária. Sem o token a API responde HTTP 200 com `{"error":"NO-USER"}`, por isso a recusa é detectada pelo corpo, não pelo status.

### Viabilidade (resolvida)

A feature 001 confirmou o acesso sem login: veredito **viável** em 2026-10-12, com o puzzle diário completo (grade, dicas e solução). Detalhes em `specs/001-viabilidade-fonte/decision.md`.

### Janela de histórico

A resposta lista só **31 datas passadas** em `dates`, mais 6 futuras. Mesmo assim, a feature 003 confirmou que uma data fora da lista ainda responde: 2026-09-01 veio completa (`specs/003-adaptador-oglobo/findings.md`). Então `dates` é só a janela que o widget mostra. O limite real do histórico ainda não é conhecido, e a coleta diária (seção 4, Cache) continua sendo a garantia de que nenhum puzzle se perde.

A API é não oficial e de terceiros, e pode mudar sem aviso. Por isso toda a integração fica isolada em um adaptador (seção 4) e coberta por testes de contrato.

## 3. Stack

Monorepo em **npm workspaces**, tudo em **TypeScript**.

```
cruzadinha/
  apps/
    api/          Fastify + Drizzle + Postgres
    web/          React + Vite + React Router + TanStack Query
  packages/
    shared/       tipos e schemas Zod (puzzle, progresso, API)
  docker-compose.yml
  docs/
```

| Camada    | Escolha                                                                                     |
| --------- | ------------------------------------------------------------------------------------------- |
| Back      | Fastify, Drizzle ORM, Zod, `@fastify/cookie`, `@node-rs/argon2`                             |
| Front     | React, Vite, React Router, TanStack Query, CSS com variáveis                                |
| Banco     | Postgres                                                                                    |
| Testes    | Vitest, Testing Library, Playwright (poucos caminhos)                                       |
| Qualidade | Prettier, ESLint, `tsconfig.base.json`, `.editorconfig`, Husky, lint-staged, GitHub Actions |

### Padrão de código

- **Prettier:** `semi: false`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`, `tabWidth: 2`.
- **ESLint** com configuração flat, `typescript-eslint`, `eslint-config-prettier`. O front acrescenta `eslint-plugin-react-hooks` e `eslint-plugin-jsx-a11y`.
- Configuração base na raiz, estendida por cada pacote. `tsconfig.base.json` com `strict: true`.
- **Husky + lint-staged:** o pré-commit formata e confere só os arquivos alterados. O pré-push roda `typecheck` e os testes rápidos.
- **Scripts na raiz:** `npm run lint`, `format`, `typecheck` e `test`, que rodam em todos os workspaces (`--workspaces --if-present`).
- **CI (GitHub Actions):** `npm ci`, lint, typecheck e testes a cada push.

## 4. Back (`apps/api`)

Camadas por módulo: rota → serviço (regra de negócio) → repositório (SQL). Rotas não têm lógica, e serviços não conhecem HTTP.

```
apps/api/src/
  server.ts          cria o app, plugins e rotas
  config.ts          variáveis de ambiente validadas com Zod
  db/                conexão, schema e migrações (Drizzle)
  modules/
    auth/            cadastro, login, logout, sessão, limite de tentativas
    invites/         geração, cota, validação, revogação
    puzzles/         rotas e cache (o formato interno fica em packages/shared)
    progress/        salvar e ler o progresso
  sources/
    types.ts         interface PuzzleSource
    oglobo/          única parte que conhece a Agilmente: pedido, token,
                     schema da resposta, conversão ipuz, fixtures e source:check
  cli.ts             invites create | list | revoke; puzzles collect
```

### Fonte de puzzles

`puzzles` conhece apenas a interface `PuzzleSource`. O adaptador `oglobo` gera o token anônimo (guardado em memória, e trocado por um novo se a fonte o recusar), busca o puzzle e converte o ipuz para o **formato interno**. Adicionar uma fonte é escrever outro adaptador, sem tocar no resto.

### Formato interno de puzzle (`packages/shared`)

Próximo do ipuz, mas só com o que o jogo usa:

- **Grade:** dimensões e células (posição, bloco ou letra esperada).
- **Palavras:** posição inicial, direção, número e tamanho.
- **Dicas:** texto associado a cada palavra.
- **Metadados:** fonte, nível e data.
- A resposta correta fica em campo separado e vai ao navegador junto do puzzle, só para usuário logado, para o front controlar as dicas (feature 007, constituição 3.0.0).

### Modelo de dados (Postgres)

| Tabela     | Campos                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `users`    | `id`, `email` (único), `password_hash`, `created_at`                                                                                  |
| `invites`  | `id`, `code_hash`, `created_by` (nulo se criado pela CLI), `created_at`, `expires_at`, `used_by`, `used_at`, `revoked_at`             |
| `sessions` | `id_hash`, `user_id`, `expires_at`                                                                                                    |
| `puzzles`  | `id`, `source`, `level`, `date`, `data` (JSON), `solution` (JSON); único em `(source, level, date)`                                   |
| `progress` | `user_id`, `puzzle_id`, `cells` (JSON), `elapsed_ms`, `best_ms`, `status`, `updated_at`, `completed_at`; chave `(user_id, puzzle_id)` |

Preferência do usuário (tema claro, escuro ou automático) fica numa coluna de `users`.

### Cache

O puzzle é o mesmo para todos, então fica uma vez só na tabela `puzzles`, compartilhada; só o `progress` é por usuário. Um puzzle guardado não é buscado de novo.

**Coleta diária:** um comando da API (`cli.ts puzzles collect`) busca o puzzle do dia (nível `daily`, o único publicado) e grava no banco. Ele roda por agendamento (seção 9), sem depender de a API estar acordada.

- Grava com upsert em `(source, level, date)`, então rodar duas vezes não muda nada.
- Roda duas vezes por dia, para tolerar atraso ou falha do agendamento.
- Além do dia, busca as datas passadas que faltam dentro de uma janela de dias configurável (`COLLECT_HISTORY_DAYS`, padrão 31, máximo 365), com pausa entre os pedidos. O limite real de histórico da fonte é desconhecido, então a janela se ajusta sem mudar código.
- Pede no máximo um puzzle por nível e data, com pausa entre pedidos, e para ao receber sinal de limite de uso.
- Grava só o formato interno (dados e solução), não a resposta bruta da fonte, para guardar apenas o necessário para jogar.

**Busca sob demanda:** se alguém pedir uma data que não está no banco, não é futura e a fonte ainda tiver, a API busca na hora e grava, como fallback da coleta. Cada ida à fonte conta num limite persistido por endereço (30 por hora), para um usuário logado não martelar a fonte.

### Endpoints (visão geral)

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `POST /api/invites`, `GET /api/invites` (os do próprio usuário)
- `GET /api/puzzles?level=&date=`, `GET /api/puzzles/:id`
- `GET /api/library` (datas disponíveis, com o status do usuário)
- `PUT /api/progress/:puzzleId`, `GET /api/progress/:puzzleId`
- `PATCH /api/me/preferences` (tema)

## 5. Front (`apps/web`)

```
apps/web/src/
  app/            rotas, layout, guarda de login, provedor de tema
  features/
    auth/         login e cadastro
    library/      seletor de nível e data
    game/         tela do jogo: tabuleiro, dicas, teclado, cronômetro
    invites/      easter egg Konami e modal do convite
  game-logic/     lógica pura do tabuleiro, sem React (reducer testável)
  api/            cliente HTTP único, com tipos de packages/shared
  themes/         tokens claro e escuro
  components/     peças genéricas (botão, modal)
```

- **Estado:** o estado da partida vive no `game-logic` (reducer). O restante vem do TanStack Query, sem biblioteca global de estado.
- **Visual:** CSS com variáveis, sem biblioteca de UI pronta. Os componentes não têm cores nem medidas fixas e leem tokens. O tema padrão tem dois conjuntos de valores, claro e escuro. Um tema novo no futuro é um novo arquivo de tokens.
- **Responsivo:** o jogo precisa funcionar bem no celular, com teclado próprio na tela.

### Modo claro e escuro

- Padrão: segue `prefers-color-scheme`, sem piscar branco ao carregar.
- Um botão no cabeçalho alterna entre automático, claro e escuro.
- A escolha é aplicada na hora, salva no perfil do usuário e, antes do login, em `localStorage`.
- Critério de aceite: nos dois modos, bloco, célula selecionada, palavra ativa e letra preenchida têm contraste claro entre si.

## 6. Regras

### Jogo

1. Uma célula fica selecionada por vez, e a palavra ativa na direção atual fica destacada.
2. Clicar numa célula já selecionada alterna a direção.
3. Digitar uma letra a preenche e avança para a próxima célula da palavra. Apagar volta uma célula.
4. As setas movem a seleção. Tab e Shift+Tab pulam para a próxima ou anterior palavra.
5. Clicar numa dica seleciona a palavra correspondente.
6. Só entram letras A a Z e "Ç". Letras acentuadas são convertidas para a letra simples.
7. Células de bloco não são selecionáveis.
8. Ao completar uma palavra, o cursor **fica na última letra**.
9. Grade completa e correta marca o jogo como concluído. Grade completa e errada não mostra aviso.

### Progresso

10. O progresso é salvo automaticamente (com debounce) e ao sair da página. Se o salvamento falhar, as letras ficam guardadas localmente e o envio é repetido.
11. O cronômetro corre com a aba ativa e pausa ao trocar de aba.
12. Um puzzle concluído abre em modo leitura, com a opção de jogar de novo do zero. O melhor tempo é guardado.
13. Cada usuário só enxerga o próprio progresso.

### Conta e sessão

14. Senha com no mínimo 8 caracteres, hash argon2. E-mail único.
15. Sessão no servidor, com cookie `HttpOnly` e `SameSite=Lax`, validade de 30 dias.
16. Limite de tentativas de login (por exemplo 5 em 15 minutos).
17. Mensagens de erro de login e cadastro são genéricas e não revelam se um e-mail existe.

### Convites

18. O cadastro só funciona com um convite válido, de uso único.
19. O código tem cerca de 16 caracteres aleatórios. Ele aparece uma vez, na criação. O banco guarda só o hash.
20. Validade de 7 dias por padrão. Pela CLI, pode ser alterada (`--days`).
21. Convite inexistente, usado, expirado ou revogado dá a mesma mensagem: "convite inválido".
22. O convite é consumido na mesma transação que cria o usuário. Se o cadastro falhar, ele não é gasto.
23. O convite não é amarrado a um e-mail.
24. **Geração pelo easter egg:** um usuário logado digita a sequência Konami (↑ ↑ ↓ ↓ ← → ← → B A). O front chama `POST /api/invites`, e o servidor decide. O código de sequência no front serve só para a descoberta. A proteção está no servidor: exige sessão e aplica a cota.
25. **Cota:** no máximo 3 convites ativos por usuário (não usados, não expirados e não revogados). Usado, expirado ou revogado libera uma vaga.
26. O cadastro e a geração de convites têm limite de tentativas por IP.
27. A CLI (`create`, `list`, `revoke`) é do autor e não tem cota.

### Puzzles

28. Datas futuras, ou sem puzzle na fonte, aparecem como indisponíveis.
29. Se a fonte estiver fora do ar, o site continua mostrando o que já está em cache e avisa que não consegue buscar novos.
30. A resposta correta vai ao navegador junto do puzzle, só para usuário logado; o front controla as dicas (feature 007).

## 7. Tratamento de erros

| Situação                          | Comportamento                                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| Fonte fora do ar ou formato mudou | API responde 502. O front diz que não conseguiu buscar o puzzle e oferece os que estão em cache |
| Puzzle não existe na data         | 404, mostrado como indisponível                                                                 |
| Falha ao salvar progresso         | Letras guardadas localmente e envio repetido                                                    |
| Sessão expirada                   | Redireciona ao login e volta ao puzzle depois                                                   |
| Login ou cadastro inválido        | Mensagem genérica                                                                               |

## 8. Testes

- **`game-logic` (Vitest):** seleção, digitação, direção, avanço, conclusão. É a parte com mais regras.
- **Conversão de formato:** testes com respostas reais da Agilmente salvas como fixtures. Se o formato mudar, o teste quebra e avisa.
- **Convites e autenticação:** integração com Postgres real em container, cobrindo uso único, expiração, cota de 3, revogação e limite de tentativas.
- **Progresso:** integração do salvamento e da leitura.
- **Ponta a ponta (Playwright):** um ou dois caminhos principais: cadastro com convite, abrir um puzzle, digitar e conferir o progresso salvo.
- **Teste real contra a Agilmente:** fica fora da rotina automática, para a suíte não depender da internet. Roda sob demanda.

## 9. Infra e implantação

Meta: custo zero, sem prazo de expiração.

| Peça            | Opção                                                                |
| --------------- | -------------------------------------------------------------------- |
| Front estático  | Cloudflare Pages                                                     |
| API (container) | Render (plano free; dorme após ~15 min, com cold start de 30 a 60 s) |
| Banco           | Neon (Postgres)                                                      |
| Coleta diária   | GitHub Actions agendado (`schedule`)                                 |

- **Mesmo domínio:** o front repassa `/api/*` para a API, para o cookie `HttpOnly` funcionar e dispensar CORS. No Cloudflare Pages isso exige uma Pages Function que faça o proxy (o `_redirects` não repassa para hosts externos), e a confirmação disso é uma tarefa do plano de implantação. Em desenvolvimento, o Vite faz o proxy.
- **Desenvolvimento local:** `docker compose` para Postgres e API, mais o Vite.
- **Portabilidade para AWS:** a API roda num Dockerfile, a configuração é só por variáveis de ambiente, o Postgres é padrão (migrações Drizzle) e o front é estático (S3 + CloudFront). A migração é troca de deploy, sem mudar código de aplicação. A AWS não foi escolhida porque o plano grátis dura 6 meses.
- **Cold start:** a primeira tela mostra "acordando o servidor" enquanto a API acorda.
- **Coleta diária:** um workflow agendado do GitHub Actions roda `puzzles collect` duas vezes por dia e grava direto no Neon, com a `DATABASE_URL` guardada nos segredos da CI. Não depende do Render acordado e reusa o adaptador e o repositório da API. O workflow roda às 00:01 e às 08:00 de Brasília, não aplica migrações (a API as aplica ao subir) e é ignorado, com um aviso, enquanto o segredo não existe; avisa quando falha. Em repositório público, o GitHub desativa agendamentos depois de 60 dias sem commits, o que precisa ser acompanhado. O cron do Render foi descartado por ser pago.

## 10. Ordem sugerida da implementação (para o plano)

1. **Teste de viabilidade da Agilmente** (obter token e buscar um puzzle real). Concluído: viável.
2. Monorepo, ferramentas de qualidade, Docker Compose e CI.
3. `packages/shared` (formato interno) e adaptador `oglobo` com fixtures.
4. Banco, `auth` e `invites`.
5. `puzzles` (com a coleta diária e o workflow agendado), `library` e `progress`.
6. `game-logic` e tela do jogo, com temas claro e escuro.
7. Biblioteca, convites pelo easter egg e acabamento.
8. Implantação.

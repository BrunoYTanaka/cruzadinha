# Quickstart: validar o front básico

**Feature**: [spec.md](./spec.md) | **Plano**: [plan.md](./plan.md) | **Contratos**: [contracts/](./contracts/)

Roteiro para provar, de ponta a ponta, que a feature funciona. Pré-requisitos: Node.js 24 (`nvm use`), Docker com Compose e o `.env` copiado de `.env.example`.

## 1. Preparar

```sh
npm ci
cp .env.example .env              # se ainda não existir
docker compose up -d postgres     # só o banco
npm run db:migrate -w @cruzadinha/api
npm run db:seed -w @cruzadinha/api  # conta de teste e cruzada de amostra de hoje
```

O seed cria a conta `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` do `.env` e uma cruzada de amostra 5 × 5 para hoje (Brasília), sem rede.

## 2. Rodar

```sh
npm run dev -w @cruzadinha/api    # API em http://localhost:3000
npm run dev -w @cruzadinha/web    # site em http://localhost:5173 (proxy /api)
```

## 3. Cenários manuais (resumo dos critérios da spec)

| # | Passos | Resultado esperado |
|---|---|---|
| 1 | Abrir `/` sem sessão | vai ao login; depois de entrar com a conta do seed, volta a `/` (FR-001) |
| 2 | Criar um convite pela CLI (`npm run cli -w @cruzadinha/api -- invites create`) e cadastrar uma conta nova em `/cadastro` | conta criada e biblioteca aberta; convite inválido mostra "Convite inválido." (US1) |
| 3 | Na biblioteca, ver o mês atual; abrir o dia de hoje | calendário com estados por texto; hoje abre o jogo (US2) |
| 4 | Digitar letras, trocar direção, usar setas, Tab e dicas | seleção, palavra ativa e avanço seguem as regras 1 a 9 do design (US3) |
| 5 | Recarregar no meio do jogo; abrir de outro navegador logado | letras e tempo continuam (SC-004) |
| 6 | Simular falha de rede (DevTools offline), digitar, voltar online | letras enviadas depois, nada perdido (SC-005) |
| 7 | Usar "Letra" e "Palavra" até o limite; usar "Verificar" | contadores sobem, botões esgotados ficam desabilitados, marcas roxa e vermelha aparecem (US4) |
| 8 | Recarregar a página | contadores e marcas continuam; em outro navegador começam do zero (FR-020) |
| 9 | Completar a grade certa | janela de conclusão com tempo, melhor tempo e ajudas; "Ver o tabuleiro" abre o modo leitura; "Jogar de novo" zera mantendo o recorde (US5) |
| 10 | Alternar tema auto, claro e escuro; recarregar | sem flash branco; escolha lembrada (US6) |
| 11 | Digitar ↑ ↑ ↓ ↓ ← → ← → B A na biblioteca | janela do convite com o código uma vez; no jogo nada abre (US7) |
| 12 | Navegar só com teclado e, depois, com um leitor de tela | tudo acessível, foco visível, células e dica anunciadas (SC-006) |
| 13 | Abrir um dia passado não guardado | "Buscando…" e depois o jogo, ou o motivo (404, 502 ou 429) (US2) |
| 14 | No jogo, expirar a sessão (apagar o cookie no DevTools) e digitar | o jogo continua; aparece "Sua sessão expirou. Entre de novo para salvar"; o botão abre o login por cima com o e-mail somente leitura; ao entrar, as letras guardadas são enviadas sem sair da tela (FR-032) |
| 15 | Cortar a rede e completar a grade certa | a janela de conclusão abre na hora com o tempo e "Vamos registrar quando a conexão voltar"; ao voltar a rede, o melhor tempo aparece (US5) |
| 16 | No modo leitura, cortar a rede e escolher "Jogar de novo" | "Sem conexão. Tente de novo quando voltar", modo leitura mantido (US5) |
| 17 | Concluir a mesma cruzada em outro navegador enquanto joga neste | o jogo continua e aparece "Esta cruzada já foi concluída em outro aparelho" com "Ver como ficou"; nada muda sozinho (US3) |
| 18 | Forçar um `502` ao buscar um dia e voltar à biblioteca | aviso "Novas cruzadas não podem ser buscadas agora"; some depois de 10 minutos ou de uma busca que funcione (US2) |
| 19 | Atrasar ou adiantar o relógio do aparelho em 10 minutos e jogar | o progresso continua sendo salvo (relógio corrigido pelo servidor) e o indicador mostra "Salvo" |

## 4. Testes automáticos

```sh
npm run lint
npm run typecheck
npm test                          # unitário e de componente (inclui contraste dos tokens e axe)
npm run test:e2e -w @cruzadinha/web   # Playwright: dois caminhos; precisa de API e Postgres rodando
```

O E2E usa a cruzada de amostra do seed e nunca a fonte real. A CI roda `format:check`, `lint`, `typecheck`, `test` e `build` a cada push, e o job `e2e` com um Postgres de serviço.

## 5. Critérios para considerar a feature pronta

- Os 19 cenários acima passam.
- `npm test` e `npm run test:e2e` passam; `lint` e `typecheck` sem avisos.
- Auditoria de acessibilidade (axe, Playwright) sem violações críticas e contraste dos tokens dentro dos mínimos, nos dois temas (SC-006 e SC-007).
- A grade 11 × 11 cabe em 360 px sem rolagem horizontal (SC-008).
- Toda cruzada mostra a atribuição à fonte (SC-009).

## 6. Resultados da validação (2026-10-14)

Ambiente: Chromium (Playwright 1.64), API de desenvolvimento com Postgres local e a cruzada de amostra do seed; nada foi pedido à fonte real.

### Medições (T103 e T104)

| Critério | Resultado |
|---|---|
| SC-003: letra digitada visível (CPU 4× mais lenta, 360 px, 20 letras, grade 11 × 11) | mediana 33 ms, p95 e máximo 77 ms (limite de 100 ms) |
| SC-008: grade 11 × 11 em 360 px | células de 30 px, grade de 344 px, sem rolagem horizontal |
| Computador, grade 11 × 11 (dica ativa e fonte na coluna das dicas) | 1280×720: células de 47 px; 1440×900: 64 px; 1920×1080: 80 px; sem rolagem vertical em nenhum |
| Bundle inicial | `index` 702 kB (212 kB gzip), jogo em bloco separado (46 kB, 14 kB gzip) carregado só ao jogar. Acima do aviso de 500 kB do Vite: a maior parte é React, React Router, TanStack Query e Zod. Dividir mais fica como melhoria futura |
| Requisições a terceiros | nenhuma: só a origem do próprio site (fontes e imagens vêm do pacote) |

### Auditoria de teclado e leitor de tela (T090)

- Ordem de tabulação conferida em login, biblioteca e jogo: "Pular para o conteúdo", marca, tema, "Sair", conteúdo. Todo controle mostra o contorno de foco (3 px).
- No jogo o foco inicial já está no tabuleiro (uma parada de tabulação). Tab percorre as palavras (regra 4 do design) e, depois da última, segue para a lista de dicas; as ajudas ficam antes do tabuleiro e se alcançam com Shift+Tab a partir da primeira palavra.
- `axe` (Playwright) sem violações em login, biblioteca, jogo e jogo com a legenda aberta, nos temas claro e escuro (a regra de contraste fica desligada só nas células do tabuleiro). Achados e correções: a tela do jogo não tinha título de nível 1 e a lista de dicas pulava do nível 1 para o 3 (agora há um `h1` só para leitores de tela e as listas usam `h2`).
- **Não feito aqui**: teste com um leitor de tela de verdade (NVDA, VoiceOver ou TalkBack). Os rótulos, regiões `aria-live` e títulos estão cobertos por testes, mas a escuta real precisa de uma pessoa.

### Cenários (T105)

| # | Como foi conferido |
|---|---|
| 1 a 4, 7 a 9 | E2E `fluxo-principal` e `ajudas-e-retomada` (convite pela CLI, cadastro, biblioteca, jogo, ajudas, recarregar, conclusão, modo leitura, jogar de novo) |
| 5 e 6 | E2E (recarregar mantém letras e ajudas; rede caída não tira o tabuleiro e volta a salvar) |
| 10 | E2E nos dois temas (`data-theme` aplicado antes da primeira pintura) e testes do botão de tema |
| 11 | Ao vivo: a sequência abre a janela do convite na biblioteca (código uma vez, "N convites ativos"; com 3 ativos, a explicação sem repetir a cota) e não abre nada no jogo |
| 12 | Teclado e `axe` conferidos (acima); leitor de tela real **pendente** |
| 13 | Coberto por testes de componente com 404, 502 e 429 simulados. **Não** foi pedido um dia antigo à fonte real |
| 14 | E2E (cookie apagado: o aviso aparece e o tabuleiro continua) e teste do login por cima |
| 15 e 16 | Ao vivo: conclusão sem rede abre a janela com "—" e "Vamos registrar quando a conexão voltar"; ao voltar a rede aparece o melhor tempo e "Novo recorde"; "Jogar de novo" sem rede mostra "Sem conexão. Tente de novo quando voltar." e mantém o modo leitura |
| 17 | Ao vivo com dois navegadores: o aviso "Esta cruzada já foi concluída em outro aparelho." aparece, a grade segue editável e "Ver como ficou" abre o modo leitura |
| 18 | Ao vivo com um `502` forçado: mensagem própria e, na biblioteca, "Novas cruzadas não podem ser buscadas agora" |
| 19 | Ao vivo com o relógio do aparelho 10 minutos adiantado: a letra foi salva no servidor e o indicador mostrou "Salvo" |

### Achados durante a validação

- A solução da fonte traz letras com acento (`Ã` no exemplo), e o jogo comparava com a letra simples digitada: a grade nunca era dada como certa. Corrigido em `game-logic` (`plainLetter`), com testes.
- O desvio do relógio usava o cabeçalho `Date`, que perde os milissegundos: um salvamento logo depois de outro aparelho podia parecer mais antigo e ser ignorado pelo servidor. O desvio agora usa o meio do segundo.
- Um laço assíncrono infinito no `save-queue` (depois de `dispose` com a rede caída) esgotava a memória do teste; corrigido.

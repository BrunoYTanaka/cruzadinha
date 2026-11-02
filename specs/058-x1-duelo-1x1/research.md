# Research: x1 de cruzada

Decisões do plano. A issue fixa o produto; aqui ficam as escolhas técnicas e os valores que a spec deixou em aberto.

## R1 — Valores padrão (a spec deixou em aberto)

- **Decision**: teto de 5 duelos `open`+`running` criados por pessoa; prazo para começar: 1 h, 24 h (padrão), 7 dias; tempo máximo: sem limite, 15, 30 (padrão), 60 min; ajuda: livre, proibida ou +30 s (padrão de penalidade) por ajuda, com +10/+30/+60 s como opções; limites de taxa por endereço: criar 10/h, consultar código 30/h, "Meus x1" de visitante 60/h; lote de tokens ≤ 20 por requisição; polling de "Meus x1" 15 s, de espera 5 s.
- **Rationale**: valores de jogo entre amigos, na ordem de grandeza dos limites já usados (`PUZZLE_FETCH` 30/h, `VERIFY_TOKEN` 30/h). Ficam em `defaultRateLimits` e constantes do módulo, injetáveis nos testes.
- **Alternatives**: valores livres do criador (rejeitado: mais validação e abuso); limites por usuário (rejeitado: visitante não tem usuário; o endereço serve aos dois).

## R2 — Modelo de dados e estados

- **Decision**: `duels` (uma linha por duelo) e `duel_participants` (até 2 por duelo, `role` `creator|opponent`). Estado armazenado: `open`, `running`, `finished`, `cancelled`. `resolveDuel(row, participants, now)` é pura e devolve o estado *efetivo* (expirado, W.O., vitória, empate); o repositório só persiste transições decididas por ação (começar, terminar, desistir, cancelar, recusar). Prazo vencido não escreve nada na leitura; uma ação posterior, ou o cron, materializa.
- **Rationale**: atende "prazo vencido é calculado na leitura, o cron só limpa". Separar o estado persistido do efetivo evita escrever em GET.
- **Alternatives**: job que muda estados a cada minuto (rejeitado: Render free dorme; e a spec manda calcular na leitura).

## R3 — Identidade e três tokens

- **Decision**: token do link (32 bytes aleatórios, base64url, guardado **em claro** em `duels.link_token`, único: o servidor precisa devolvê-lo em "Meus x1" e no resultado da busca por código para o site montar `/x1/<linkToken>`; só participantes e quem tem o código/link o recebem); código de 8 caracteres do alfabeto `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (sem 0/O/1/I/L), único por duelo `open`, guardado em claro (é curto e só encontra `open`); token do participante (32 bytes, SHA-256 em `participant.token_hash`) devolvido uma só vez ao criar/aceitar. Credencial da requisição: sessão (se houver, vence) ou `participantToken` no corpo.
- **Rationale**: o código em claro permite busca indexada; ele só revela duelos abertos e tem limite de taxa e 31^8 ≈ 8,5·10^11 combinações. O token do participante nunca fica em claro no banco; o do link em claro é aceito porque equivale ao código e só vale para um duelo de amigos.
- **Alternatives**: hash também do token do link (rejeitado: o servidor não poderia reconstruir o link para o "Meus x1" de quem entra em outro aparelho); um token único (rejeitado: a spec exige três que não se misturam); código com hash (rejeitado: busca por força bruta barata não muda a segurança e atrapalha o índice único parcial).

## R4 — Jogo do duelo no site

- **Decision**: o duelo usa `GameScreen` e `useGame` com um terceiro dono `kind: 'duel'`: o salvamento vai para um armazenamento local por duelo (`cruzadinha:duel:<duelId>:…`, nunca a chave do jogo normal nem do visitante), o relógio vem do servidor (`startedAt` + `getServerClockOffsetMs`), o diálogo de configurações não o pausa e as ajudas seguem a regra do duelo (proibidas = desabilitadas; penalidade = contada e somada). `features/game` passa a exportar `useGame`, `GameOwner` e o necessário; `ordem` no dependency-cruiser coloca `duel` depois de `game`. Ao concluir, o site envia `finish` com as ajudas usadas; o servidor calcula `elapsed = now − started_at`.
- **Rationale**: reaproveita a tela, o teclado, o lápis e a estrutura de salvar sem duplicar o tabuleiro; isola por dono, como a 013 fez para visitante e conta. Relógio do servidor atende "não reinicia ao recarregar" porque é derivado de `started_at`.
- **Alternatives**: copiar o `GameScreen` (rejeitado: duplicação); salvar o progresso do duelo no servidor (rejeitado: a spec aceita ajudas e conclusão declaradas pelo cliente e não pede validação).

## R5 — Concorrência do "Começar"

- **Decision**: `UPDATE duels SET state='running', ... WHERE duel_id=$1 AND state='open'` seguido de `INSERT` do oponente na mesma transação; quem não afetar linha recebe `409 duel-taken`. Para o criador/oponente começarem, `start` é idempotente por participante (segunda chamada devolve o mesmo `startedAt`).
- **Rationale**: o `WHERE state='open'` é o teste atômico; não precisa de `FOR UPDATE` extra. Teste de integração com duas requisições simultâneas.
- **Alternatives**: lock otimista com versão (rejeitado: mais campos sem ganho).

## R6 — Rotas sem URL com credencial

- **Decision**: todas as rotas com token/código são `POST` com corpo (`lookup`, `start`, `decline`, `state`, `finish`, `forfeit`, `cancel`, `mine`). O link do convite é `/x1/<linkToken>` (caminho do site, não de API); o link de retorno do visitante é `/x1/<linkToken>#p=<participantToken>` (fragmento, lido uma vez, como na 042). Cabeçalhos: `noindex, nofollow` e `Referrer-Policy: no-referrer` em `/x1/*`.
- **Rationale**: o caminho do site não é enviado ao servidor da API; as chamadas levam o token no corpo. O fragmento nunca sai do navegador.
- **Alternatives**: `GET /api/duels/:token` (rejeitado: token em URL de log/proxy).

## R7 — Calendário em modo de seleção

- **Decision**: `Calendar` e `DayCell` ganham a prop opcional `selection?: { onSelect(day), selectedId?, isSelectable(day) }`. Selecionável = estados `not_started`, `in_progress`, `completed` (cruzada salva e não futura); `none`, `fetchable`, `future` ficam como texto sem ação. Concluídos mostram o tempo e "você já fez esta" (texto visível e falado). Sem a prop, o render e os testes atuais ficam iguais.
- **Rationale**: pequena mudança aditiva. `fetchable` fica fora porque o duelo precisa de cruzada já salva. Visitante: `useSourceLibraries` já mescla o IndexedDB com a biblioteca (feature 056), então os estados "concluído" valem. **A verificar na tarefa**: `GET /api/library` sem sessão devolve `puzzleId` por dia salvo; se não, o ajuste é no cliente.

## R8 — Limpeza e cron

- **Decision**: `auth cleanup` ganha a etapa "duelos": apaga só duelos expirados, isto é, `open` com prazo vencido há mais de 7 dias e `running` em que ninguém terminou e o prazo venceu há mais de 7 dias, e `cancelled` com mais de 30 dias; **nunca apaga `finished`**, que a entrega 2 vai listar. Participantes caem por `ON DELETE CASCADE`. Imprime `Duelos apagados: N.`.
- **Rationale**: reaproveita o job que já roda duas vezes por dia e respeita "o cron só limpa expirados".
- **Alternatives**: comando novo (rejeitado: mais um passo no workflow).

## R9 — Compatibilidade

- **Decision**: só rotas e tabelas novas; `rateLimitActions` e o `CHECK` crescem em migração (`0012`). Site novo com API antiga: `/api/duels/*` dá 404 e as páginas do duelo mostram "O x1 não está disponível agora" (mesmo padrão do 400 de fonte). API nova com site antigo: sem efeito.
- **Rationale**: regra "duas versões" do `docs/versionamento.md`.

## R10 — "Meus x1": lista e contador

- **Decision**: a lista traz duelos `open`, `running` e `finished` nas últimas 24 horas. O contador do menu soma `running` em que a pessoa ainda não terminou e `finished` nas últimas 24 horas. Sem coluna "visto".
- **Rationale**: dá tempo de ver o resultado sem estado novo; a entrega 2 cobre o histórico.
- **Alternatives**: coluna `result_seen_at` (rejeitado: mais um dado de visitante no servidor).

## R11 — Apelido

- **Decision**: apelido obrigatório para todos (1–24 caracteres); a conta não tem nome público e o e-mail nunca aparece. O site guarda o último apelido em `localStorage` (`cruzadinha:duel-nickname`).

## R12 — Relógio nos testes

- **Decision**: todo instante de regra (`start_deadline_at`, `started_at`, `finished_at`, a janela das 24 h de "Meus x1", a retenção do cron) vem do `Clock` injetado (`apps/api/src/platform/lib/clock.ts`) e é gravado explicitamente; o banco nunca decide `now()` para essas colunas. `created_at`/`updated_at` seguem do `defaultNow()` e do trigger, e nenhuma regra os lê. Os limites de taxa já recebem `now` da aplicação. Testes unitários e de integração avançam um `Clock` falso; o e2e usa o relógio real e nunca afirma um tempo exato (só ordem, presença e faixas largas); prazo vencido, tempo esgotado e W.O. ficam só nos testes com `Clock` falso. No site, os testes usam `vi.useFakeTimers()` e o deslocamento do relógio do servidor injetado.
- **Rationale**: misturar `now()` do banco com o `Clock` falso quebraria os testes de integração (prazo "no passado" que o banco não enxerga); tempo exato no e2e geraria testes instáveis.
- **Alternatives**: expor um relógio falso no servidor de e2e por variável de ambiente (rejeitado: caminho de teste em produção); `now()` do banco em tudo (rejeitado: impede testar prazos).

## R13 — Valores definidos na implementação

- `NO_LIMIT_GRACE_MS` = 6 h: sem tempo máximo, quem já começou tem até o prazo de início ou 6 h depois do próprio início (o que for maior) antes do W.O.; sem isso um oponente que abandona travaria o duelo.
- Teto de duelos abertos: por conta (5, contando `open` e `running` com prazo de início válido). Visitantes não têm identidade estável; ficam sob o limite de criações por endereço (10/h).
- `decline` devolve `{ declined: true }`: quem recusa não vira participante, então não há `DuelView` para ele.
- Códigos de erro novos em `apiErrorCodeSchema`: `not-found`, `duel-taken`, `own-duel` (reservado), `open-limit`, `not-running`, `not-open`.

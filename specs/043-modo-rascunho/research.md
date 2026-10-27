# Research: Modo rascunho (lápis)

## R1. Onde guardar o rascunho do visitante

- **Decision**: em chave própria do `localStorage`, `cruzadinha:draft:guest:<puzzleId>`, e não como campo novo do registro `GuestProgress` no IndexedDB.
- **Rationale**: `guestProgressRecordSchema` é `strictObject` e `guest-store.ts` apaga (`db.delete`) o registro que não passa no schema. Com a PWA (feature 041) uma aba com a versão anterior do site pode seguir aberta depois do deploy; ao ler um registro com `draft`, ela apagaria o progresso e o recorde do visitante. A chave separada mantém a duração pedida (some com a conclusão, o reinício e "Jogar de novo"; a cruzada em andamento já é protegida pelo limite) sem tocar o registro.
- **Alternatives considered**: campo `draft` opcional no registro (perda de dados em aba antiga); store novo no banco `cruzadinha-visitante` (exige versão 2 do banco, e uma aba antiga bloqueia o `upgrade`).

## R2. Onde guardar o rascunho da conta

- **Decision**: `cruzadinha:draft:<userId>:<puzzleId>` no `localStorage`, no mesmo molde de `cruzadinha:help:<userId>:<puzzleId>`; o módulo fica em `features/offline/services/draft/`.
- **Rationale**: o rascunho não vai ao servidor (FR-010); o padrão de ajudas por conta já existe e é síncrono, o que deixa o `useReducer` hidratar na abertura sem esperar. Ficar em `offline` permite que `clearAccountData`, `discardOtherAccounts` e o limite de 60 o enxerguem sem violar a ordem das features.
- **Alternatives considered**: store novo em `cruzadinha-offline` (assíncrono, exige versão 2 do banco); `features/game` (o `offline` não pode importá-lo).

## R3. Modelo no estado do jogo

- **Decision**: `draft: (string | null)[][]` com as dimensões da grade e `pencil: boolean` em `GameState`. Invariante aplicada no fim do reducer (`pruneDraft`): `draft[r][c]` só existe se `cells[r][c] === null` e a casa não está travada; em `mode: 'completed'` o rascunho é vazio.
- **Rationale**: uma camada separada deixa `isSolved`, `struckWords`, `useCopyClue`, as ajudas e as filas de salvamento intocados (FR-004, FR-010, FR-015). A invariante em um só lugar cobre de uma vez FR-006, FR-008, FR-011 e a ajuda revelando casa com rascunho (US3-4), inclusive quando a hidratação traz letras de outro aparelho.
- **Alternatives considered**: marcar a letra como provisória dentro de `cells` (mudaria o formato salvo e todas as leituras de `cells`); `pencil` só no hook, injetado em cada ação como os `limits` (espalha o estado; o reducer com o campo é mais fácil de testar).

## R4. Comportamento das teclas com o lápis

- **Decision**:
  - `type`, lápis ligado: casa livre recebe/substitui o rascunho; casa com definitiva ou travada ignora a letra; nos dois casos o cursor avança como na digitação normal (pulando travadas). Não chama `finish`.
  - `type`, lápis desligado: como hoje; a invariante apaga o rascunho da casa (FR-008).
  - `backspace`/`delete`, lápis ligado: agem só sobre o rascunho, com o mesmo movimento de cursor de hoje (a "letra apagável" passa a ser o rascunho).
  - `backspace`/`delete`, lápis desligado: a "letra apagável" é a definitiva não travada ou o rascunho (a casa tem no máximo um dos dois).
- **Rationale**: segue as clarificações da spec e mantém o movimento do cursor idêntico ao atual, sem saltos.

## R5. Confirmar e descartar

- **Decision**: `confirmDraft` copia o rascunho das casas da palavra ativa para `cells`, apaga esse rascunho e passa por `finish` (pode concluir). `discardDraft` apaga o rascunho da palavra ativa. Os dois só valem jogando; sem rascunho na palavra não mudam o estado.
- **Rationale**: FR-007 e a premissa "confirmar age sobre a palavra selecionada".

## R6. Interface

- **Decision**: componente `DraftControls` na faixa de ferramentas, ao lado das ajudas, só em modo jogo: botão de ícone "Lápis" com `aria-pressed`, e "Confirmar rascunho" e "Descartar rascunho" sempre presentes, com `aria-disabled` (focáveis) quando a palavra ativa não tem rascunho, no mesmo padrão de `HelpButtons`. Uma região `aria-live` curta anuncia "Rascunho confirmado"/"Rascunho descartado". Na célula, o rascunho usa itálico, peso menor, tamanho menor e o token de texto secundário (forma + cor, FR-003); a descrição da casa diz "rascunho A". Sem atalho de teclado nesta versão.
- **Rationale**: botões fixos não deslocam nada ao ligar o lápis (FR-013); o padrão `aria-disabled` já é o das ajudas (FR-014).
- **Alternatives considered**: mostrar confirmar/descartar só com o lápis ligado (desloca a faixa); atalho de teclado (não pedido).

## R7. Context7

- **Decision**: sem consulta. Nenhuma API de biblioteca nova é usada: `useReducer`, `useEffect` e `z.array(...).nullable()` já aparecem no código atual com as versões instaladas, e `localStorage` é API da plataforma.

## R8. Duração e limite (FR-018)

- **Decision**: `protectedIds` do `offline-store` passa a incluir os `puzzleId` com rascunho de qualquer dono; quando `enforceLimit` remove uma cruzada, apaga os rascunhos dela. Ao abrir uma cruzada concluída (visitante ou conta) o rascunho guardado é apagado. Rascunho vazio apaga a chave.
- **Rationale**: uma cruzada com rascunho conta como em andamento e o rascunho nunca sobrevive à cópia da cruzada.

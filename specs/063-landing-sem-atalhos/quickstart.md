# Quickstart: feature 063

Pré-requisitos: Node 24, `npm ci`; para e2e, API e Postgres locais (ver `CLAUDE.md`).

1. **Unit**: `npm test -w @cruzadinha/web` (Tooltip, AppLayout, LandingShell, PlayLink, SaveStatus, ClueList CSS, BoardSizeReset).
2. **Build e HTML pré-gerado**: `npm run build -w @cruzadinha/web && npm run check:build-output -w @cruzadinha/web`; conferir que `dist/index.html` não tem "Calendário", "Estatísticas", "x1" nem "Configurações" no cabeçalho.
3. **Landing** (`npm run dev -w @cruzadinha/web`): abrir `/` em 1280 px e 390 px: só marca e "Entrar"; logado, só marca e círculo. Com a API parada, clicar "Jogar agora": tela de espera (sem "Abrindo…" nem balão no botão, FR-013) e, ao subir a API, `/dia/<hoje>`. "Entrar" → login → `/calendario`.
4. **Cabeçalho interno**: `/calendario`: Calendário junto da marca; Estatísticas, x1, Instalar (quando houver) e engrenagem juntos à direita; Tab percorre na ordem visual.
5. **Balão**: clicar numa engrenagem e tirar o mouse: sem balão; Tab até ela: balão.
6. **Jogo**: visitante sem os três textos; rolar Horizontais/Verticais sem linhas cortadas sob o título; "Tamanho padrão" é ícone, ativo só após mexer na alça.
7. **E2E**: `npm run test:e2e -w @cruzadinha/web -- landing espera-servidor sem-saltos tamanhos`.
8. **Gate final**: `npm run lint && npm run typecheck && npm test && npm run build`.

# Quickstart: validar o x1

Pré-requisitos: Node 24, Docker, `cp .env.example .env`, `docker compose up -d`, `npm ci`, `npm run db:migrate -w @cruzadinha/api && npm run db:seed -w @cruzadinha/api`.

## 1. Automático

```sh
npm run typecheck && npm test && npm run lint     # inclui check:deps e a ordem das features
npm run test:int                                  # concorrência do "Começar", limites, retenção
npm run test:e2e -w @cruzadinha/web               # e2e/duelo.spec.ts, dois contextos
```

Esperado: `resolveDuel` cobre vitória, empate, desistência, W.O., prazo vencido e tempo esgotado com `Clock` falso; dois "Começar" simultâneos deixam um oponente só; calendário sem modo de seleção sem regressão (`DayCell`/`Calendar` testes de CSS e axe).

## 2. Manual (dois navegadores)

1. `npm run dev -w @cruzadinha/api` e `npm run dev -w @cruzadinha/web`.
2. Janela A (visitante): Menu → x1 → Novo; escolher o dia semeado no calendário; regras padrão; apelido "Ana". Copiar link e código.
3. Janela B (anônima): colar o código em "Meus x1"; ver as regras; `Esc` e clique fora não fecham; "Começar".
4. A também clica "Começar" e joga; B termina primeiro → "Aguardando o oponente" sem o tempo de A.
5. A termina → os dois veem vencedor, diferença, tempos e ajudas.
6. Repetir com desistir, cancelar (só em `open`), recusar e código inválido (mesma mensagem para inexistente e aceito).
7. Recarregar no meio da partida: o relógio continua do servidor; abrir configurações não pausa.

Contratos: [contracts/api.md](contracts/api.md). Dados: [data-model.md](data-model.md).

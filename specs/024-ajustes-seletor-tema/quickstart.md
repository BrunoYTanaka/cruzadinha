# Quickstart: validar os ajustes de layout e animação

Pré-requisitos: Node.js 24 (`nvm use`), `npm ci`, Docker para o Postgres local e `npx playwright install chromium` uma vez.

## 1. Testes unitários e qualidade

```sh
npm run format:check && npm run lint && npm run typecheck
cd apps/web && npx vitest run src/components/Tooltip.test.tsx src/themes/ThemeButton.test.tsx src/features/settings/SettingsDialog.test.tsx
```

Esperado: tudo verde, inclusive `tokens-contrast.test.ts` e `components/button-states.test.ts` da feature 023.

## 2. Ponta a ponta (medidas de layout)

Com a API e o Postgres locais e `DATABASE_URL` apontando para o banco de e2e (veja o `CLAUDE.md`):

```sh
npm run test:e2e -w @cruzadinha/web -- ajustes-configuracoes.spec.ts botoes.spec.ts configuracoes.spec.ts
```

Esperado, por cenário:

| Cenário | Resultado |
|---|---|
| Foco na engrenagem em 320, 360, 861 e 1920 px | bordas do balão dentro da janela (SC-001) |
| Tema: automático → claro → escuro → automático | largura e altura iguais, vizinhos parados (SC-002, SC-003) |
| Modal em 1280 px | "Sem limite" a ≤ 1 px da borda direita nas duas ajudas (SC-005) |
| Modal em 360 px | sem rolagem lateral, "Sem limite" em linha própria à esquerda |
| Escolher outra cruzada padrão | destaque em 100 a 300 ms; com movimento reduzido, imediato (SC-006) |
| Modal em 320, 360, 861 e 1920 px | interruptores iguais, com a mesma borda direita; "Restaurar padrões" na margem das outras linhas (SC-008) |
| Seletor com cores forçadas e com toque | a fonte marcada se distingue; um toque troca a fonte |
| Axe nos dois temas | sem violações (SC-007) |

## 3. Conferência manual

1. `docker compose up -d` e `npm run dev -w @cruzadinha/web`.
2. Abrir o site, deixar a janela com 360 px, passar o mouse na engrenagem: o texto "Configurações" aparece inteiro.
3. Abrir a modal, clicar no botão de tema três vezes: o botão não muda de tamanho.
4. Alargar a janela: "Sem limite" vai para a direita; estreitar: desce.
5. Trocar a cruzada padrão: o destaque desliza. Repetir com "reduzir movimento" ativado no sistema: a troca é imediata.

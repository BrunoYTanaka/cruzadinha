# Quickstart: validar a verificação automática

Pré-requisitos: `nvm use`, `npm ci`; para o e2e, API e Postgres locais com seed (ver `CLAUDE.md`).

## Automático

```sh
npm run typecheck && npm run lint && npm test
cd apps/web && npx vitest run src/domain/game/wrong-cells.test.ts src/shared/components/Menu
cd packages/shared && npx vitest run src/settings/schema.test.ts
npm run test:int          # settings.int.test.ts: pedido sem verifyOnType aceito (precisa de Docker)
npm run test:e2e -w @cruzadinha/web   # sem-saltos, ajudas-e-retomada, rascunho, botoes
```

## Manual (`npm run dev`, cruzada de teste do seed)

1. **US1**: ajustes, ligar "Verificar ao digitar"; digitar uma letra errada: casa vermelha na hora; digitar a certa: some; apagar: some.
2. **US2**: abrir "Ajudas" no jogo; ligar/desligar "Verificar ao digitar" e conferir o mesmo estado nos ajustes; ponto no botão quando ligada. Setas, Home, End, Esc e clique fora; foco volta ao botão.
3. **US3**: esgotar `Letra` e `Palavra` e ver a marca funcionando sem mexer nos contadores; lápis ligado: letra errada no rascunho sem marca; confirmar rascunho marca as erradas; desligar a opção com letras erradas escritas: marcas somem, e uma marca de "Verificar" manual feita antes continua.
4. **Celular** (janela estreita ou emulação com teclado na tela): faixa com `Letra`, `Palavra`, `Ajudas` em uma linha; menu como painel de baixo sobre o teclado, itens de 48 px.
5. **Compatibilidade**: conta sem a chave abre com a opção desligada; `PUT /api/settings` sem `verifyOnType` responde 200.
6. Conferir a entrega: DDE-004 atualizado e `npm run check:ids`.

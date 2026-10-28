# Quickstart: validar o diálogo de atalhos

Contrato: [contracts/shortcuts-dialog.md](./contracts/shortcuts-dialog.md). Tabela: [data-model.md](./data-model.md).

## Automático

```sh
cd apps/web
npx vitest run src/features/game/helpers/shortcuts.test.ts      # tabela ↔ resolveBoardKey (SC-002)
npx vitest run src/features/game/components/board/Board          # tabuleiro continua igual
npx vitest run src/features/game/components/dialogs/ShortcutsDialog
npx vitest run src/features/game/components/GameScreen           # `?`, relógio, foco, tabuleiro intacto
cd ../.. && npm run lint && npm run typecheck                    # inclui check:deps (sem ciclo)
npm run test:e2e -w @cruzadinha/web -- atalhos                   # precisa da API e do seed
```

Esperado: tudo verde; axe sem violações nos dois temas.

## Manual (`npm run dev -w @cruzadinha/web`, abrir uma cruzada)

1. Janela larga, mouse: o botão de teclado aparece na faixa; a dica "Atalhos de teclado" aparece ao passar o mouse; clicar abre a lista com 4 grupos.
2. Foco no tabuleiro, apertar `?` (no ABNT2, Shift+/ ): abre; nenhuma letra escrita. Esc fecha, o foco volta ao tabuleiro, Tab muda de palavra.
3. Aberto por 10 s: o tempo da faixa não anda. Pausar, abrir, fechar: continua pausado.
4. Janela com 800 px de largura: botão e `?` ainda funcionam.
5. DevTools em modo celular (ponteiro grosseiro) ou janela ≤ 720 px: sem botão; `?` não abre nada.
6. Concluir a cruzada, fechar o diálogo de conclusão: botão ainda abre a lista. Com o diálogo de conclusão aberto, `?` não abre outro.
7. Tema escuro e zoom 200%: legível, sem rolagem horizontal.

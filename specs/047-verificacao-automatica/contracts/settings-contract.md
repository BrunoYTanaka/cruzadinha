# Contrato: configurações e componente de menu

## `GET`/`PUT /api/settings` (sem rota nova)

- `settings.verifyOnType`: booleano.
- **Resposta** (`settingsEnvelopeSchema`): `settingsSchema.partial()`; a chave pode faltar (conta antiga), e o site usa `false`.
- **Pedido** (`saveSettingsRequestSchema`): `verifyOnType` **opcional**, como `copyClue`. Um site anterior, que não envia a chave, continua recebendo `200`; chaves desconhecidas continuam descartadas (nunca `400`).
- Exemplo OpenAPI de `settings.schemas.ts` ganha `verifyOnType: false`.
- Teste de integração: pedido sem `verifyOnType` é aceito e a leitura seguinte devolve o documento sem a chave.

## `Menu` (`shared/components/Menu`)

```ts
type MenuProps = {
  label: string                   // nome acessível do botão
  buttonContent: ReactNode        // conteúdo visível (ex.: "Ajudas ▾" + ponto)
  placement: 'popover' | 'sheet'  // sheet = preso à borda de baixo (teclado na tela)
  children: ReactNode             // MenuGroup, MenuItem, MenuCheckItem
}
// MenuItem:      role="menuitem", onSelect, disabled (aria-disabled, focável); fecha o menu ao agir
// MenuCheckItem: role="menuitemcheckbox", checked, onChange; o menu fica aberto ao alternar
// MenuGroup:     role="group" com rótulo ("Automática", "Rascunho")
```

Teclado: setas ↑↓ (com volta), Home, End, Esc (fecha e devolve o foco ao botão), Enter e Espaço acionam, Tab fecha. Clique fora fecha. Nenhuma tecla do menu chega ao tabuleiro nem ao atalho `?`.

## `withAutoMarks` (`domain/game/wrong-cells.ts`)

```ts
function withAutoMarks(state: GameState, solution: Solution): GameState['marks']
```

Pura e sem React. Devolve as marcas a desenhar quando a opção está ligada (ver data-model).

# Research: Verificação automática opcional

## R1. Marca gravada ou derivada?

- **Decision**: derivada. `withAutoMarks(state, solution)` em `domain/game` devolve o estado com `marks` somados de `wrong` para cada casa com letra, não travada, e diferente de `plainLetter(esperada)`. O resultado só alimenta o desenho (Board); o reducer, o salvamento de ajudas (`helpOf`) e a conclusão usam o `state` cru.
- **Rationale**: FR-004 exige que ligar marque tudo na hora e que desligar apague as marcas automáticas e preserve as da verificação manual. Gravar em `marks` obrigaria a distinguir os dois tipos, mudaria o formato salvo (`HelpSnapshot`) e entraria em FR-006 (progresso). Derivar não muda nenhum dado e não cria ação nova. Marca manual `wrong` vence a derivada (já é `wrong`); marca manual `helped` (roxa, de "Verificar") em casa que depois recebe letra errada fica `helped` no estado (`type` troca só `wrong` por `helped`), e a derivada `wrong` vence ao desenhar; com a opção desligada nada muda.
- **Alternatives**: ação `autoVerify` no reducer que grava `marks` a cada `type` (rejeitada: dois tipos de `wrong` misturados, desligar exige varrer); novo campo `autoMarks` no estado (rejeitada: estado derivado guardado, pode divergir de `cells`).

## R2. Comparação

- **Decision**: usar `plainLetter` (`domain/game/letters.ts`), como `completion.ts` e `clue-strike.ts`. Casa sem solução (bloco) é ignorada.
- **Rationale**: a solução pode ter letra acentuada (regra do CLAUDE.md).

## R3. Menu "Ajudas"

- **Decision**: novo `shared/components/Menu` próprio, seguindo o padrão WAI-ARIA de botão de menu: botão com `aria-haspopup="menu"` e `aria-expanded`; painel `role="menu"`; itens `menuitem` e `menuitemcheckbox` (`aria-checked`); grupos com `role="group"` e rótulo; setas, Home e End percorrem itens habilitados (desabilitado usa `aria-disabled` e continua focável, como as ajudas de hoje, então a navegação inclui o item e o leitor explica); Esc e clique fora fecham e devolvem o foco ao botão; o foco vai ao primeiro item ao abrir. As teclas dentro do menu não propagam (nada chega ao tabuleiro nem ao `?` do documento).
- **Rationale**: a constituição proíbe biblioteca de UI pronta; a issue pede exatamente esses papéis. Sem biblioteca, não há consulta ao Context7.
- **Alternatives**: `<details>` (sem navegação por setas nem `menuitemcheckbox`); popover nativo (`popover`, suporte e foco inconsistentes para o foco inicial e as setas).

## R4. Painel no celular: `Dialog` ou componente novo?

- **Decision**: o mesmo `Menu` com `placement="sheet"`, escolhido por `onScreenKeyboard` (já disponível em `GameScreen`). O painel é `position: fixed` na borda de baixo, acima do teclado da tela (`bottom: var(--keyboard-space)`), largura total, itens de `min-height: 48px`, rolagem própria se faltar espaço. Sem teclado na tela é um popover ancorado ao botão e mantido dentro da janela.
- **Rationale**: o `Dialog` é modal centrado com título e botão "Fechar", e fecha por clique no fundo; um menu precisa de foco por setas e de fechar a cada ação. Reaproveitá-lo exigiria exceções no `Dialog` usado em 5 lugares. Um só componente com duas colocações evita duplicar o teclado e os papéis.
- **Alternatives**: `Dialog` com itens (rejeitada: papel `dialog`, não `menu`, e o foco preso); dois componentes (rejeitada: duplica a lógica de teclado).

## R5. Limites de ajuda e atalho (decisões da issue)

- **Decision**: independente dos limites (nenhum contador, nenhum `usage` mexido); sem atalho de teclado novo.
- **Rationale**: "Verificar" já é ilimitado (feature 010, FR-017); a derivação nem passa pelo reducer. `shortcuts.ts` (feature 046) cobre só o tabuleiro, onde todas as teclas de letra digitam.

## R6. Compatibilidade da configuração

- **Decision**: a chave se chama `verifyOnType`, obrigatória em `settingsSchema` (padrão `false` em `defaultSettings`), e **opcional** no pedido `PUT /api/settings` (`saveSettingsRequestSchema.extend({ copyClue, verifyOnType: optional })`), igual a `copyClue` (feature 033). A leitura é campo a campo (`parseSettings`), então conta e aparelho sem a chave valem o padrão. O site anterior ignora a chave na leitura (objeto não estrito) e não a envia no pedido (aceito porque é opcional); o `jsonb` guarda a chave só quando o site novo grava.
- **Rationale**: preserva "um site mais velho aceita uma API mais nova e vice-versa" (CLAUDE.md, Deploy). Sem migração (o campo é um documento).
- **Risco conhecido**: um site anterior que grava as configurações sobrescreve o documento sem a chave (volta a `false` no próximo ajuste). Aceito: mesma consequência de `copyClue`, só com versões mistas.

## R7. Onde mexer no layout

- **Decision**: `HelpButtons` fica com `Letra` e `Palavra`; `HelpsMenu` (botão "Ajudas ▾" mais ponto) ocupa a terceira posição. O ponto é um `span` `aria-hidden` mais o nome acessível do botão ("Ajudas, verificação automática ligada"). O botão sempre existe (largura fixa pelo rótulo), então a faixa não muda ao ligar a opção. A região viva dos resultados de ajuda continua em `HelpButtons`; a dos anúncios do rascunho passa a `HelpsMenu`, porque o menu fecha ao acionar e o aviso precisa sobreviver a ele.
- **Rationale**: `e2e/sem-saltos.spec.ts` exige que nada se desloque; o menu abre sobre a página (popover/sheet), fora do fluxo.

## R8. Confirmar e Descartar

- **Decision**: mantêm a regra atual (`hasDraft` da palavra ativa e relógio pausado), em vez de "lápis desligado" da proposta da issue. Como o rascunho existe mesmo com o lápis desligado (desligar o lápis não o apaga), desabilitar só pelo lápis impediria confirmar um rascunho existente. A spec foi ajustada (FR-010 e cenário 4 do US2).

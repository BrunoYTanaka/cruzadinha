# UI Contract: Barra da dica com a largura do tabuleiro

A API não muda. Este contrato descreve o que a tela de jogo garante e como os testes o verificam. As seções 1 e 2 valem para o layout de computador (`useDesktopLayout`: `(min-width: 861px)` e sem teclado na tela) e mudam só o CSS de `GamePage.module.css`. A seção 3 é o balão de `ClueBar`, que não muda de props.

## 1. Coluna do tabuleiro no computador

O primeiro filho da coluna do tabuleiro é a barra da dica ativa (`ClueBar` com anterior/próxima) ou, na cruzada concluída, a faixa de modo leitura (`ReadModeBanner`).

| Garantia | Spec | Verificação |
| --- | --- | --- |
| Com grade de pelo menos 320 px, `x` e `width` da barra iguais aos da grade (`role="grid"`), com tolerância de 1 px | FR-001, SC-002 | e2e: `walkWords` no computador, em todas as palavras, com `lengthenClues` |
| `x` da região de dicas (`aside` "Dicas") e `width` da barra iguais em todas as palavras | FR-002, SC-001 | e2e: `walkWords` |
| Dica longa cortada com reticências; número e direção inteiros | FR-003 | e2e da 017, mantido |
| Grade com menos de 320 px: barra com 320 px em todas as palavras, centralizada sobre a grade (centros a menos de 1 px), número e direção sem corte | FR-004 | e2e: puzzle de amostra 5 × 5 com a alça no mínimo (`Home`) |
| Depois de mudar o tamanho (alça, "Tamanho padrão", largura da janela), a barra continua com a largura da grade (ou o mínimo) | FR-005, SC-003 | e2e: mínimo, padrão e máximo |
| Faixa de modo leitura com a mesma regra: largura da grade ou o mínimo, sem alargar a coluna | FR-006 | e2e: cruzada concluída, grade no mínimo e no padrão |
| Sem rolagem horizontal; tamanho padrão e limites da alça iguais aos da feature 011 | FR-007 | e2e existentes em `tamanhos.spec.ts` |
| Região viva da barra com a dica inteira | FR-008 | unitário existente em `ClueBar.test.tsx` |

## 2. Fora do computador

| Garantia | Spec | Verificação |
| --- | --- | --- |
| Celular com teclado na tela e janela estreita (721 a 860 px): a largura não muda (o balão da seção 3 vale onde houver mouse) | FR-009 | e2e da 017 (US2 no celular e janela estreita), mantidos sem alteração |

## 3. Balão com a dica completa (`ClueBar`)

Props iguais às de hoje (`word`, `onPrevious?`, `onNext?`). O balão existe nas duas variantes da barra.

| Garantia | Spec | Verificação |
| --- | --- | --- |
| Mouse parado 500 ms sobre a dica cortada (contados desde o último movimento): balão com o texto inteiro da dica (`data-testid="full-clue"`) | FR-010, SC-006 | unitário (temporizadores falsos, corte simulado) + e2e (`page.hover`, visível em até 1 s) |
| Antes dos 500 ms, com dica que cabe, ou com toque: nenhum balão | FR-011 | unitário (499 ms; sem corte) + e2e (dica curta; toque no celular) |
| Mouse da dica para o balão ou para os botões anterior e próxima: continua aberto, inclusive ao atravessar o vão de 4 px (ponte `.full::before`); fora da barra e do balão: fecha | FR-012 | unitário (`hover` no balão, `unhover` da barra) + e2e (`page.mouse.move` em passos da dica até o balão) |
| Esc fecha; o Esc do tabuleiro continua funcionando | FR-012 | unitário + e2e (Esc com o foco no tabuleiro) |
| Outra palavra ativa fecha o balão | FR-012 | unitário (`rerender` com outra `word`) |
| Abrir e fechar não move grade, barra nem `aside` "Dicas" | FR-013, SC-007 | e2e: `boundingBox` antes, com o balão aberto e depois |
| `aria-hidden="true"`; a região viva continua sendo o único anúncio | FR-014 | unitário |
| `--ink` sobre `--surface`, borda `--line`, nos dois temas | FR-015 | e2e: `color` e `background-color` calculados do balão iguais aos valores de `--ink` e `--surface` do tema, nos dois temas, mais o axe com o balão aberto (que pode pular conteúdo `aria-hidden`) |

## 4. Critérios gerais

| Garantia | Spec | Verificação |
| --- | --- | --- |
| Auditoria de acessibilidade da tela de jogo sem violações nos dois temas, com a dica ativa anunciada inteira | SC-004 | `axe` existente no e2e + unitário da região viva em `ClueBar.test.tsx` |
| Nenhuma mudança na API, em `packages/shared` nem nos dados salvos | SC-005 | diff restrito a `apps/web` (e docs); suítes da API sem mudança |

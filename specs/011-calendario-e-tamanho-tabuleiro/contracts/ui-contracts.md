# UI Contracts: Calendário mais largo e tamanho ajustável do tabuleiro

Complementa `specs/010-front-basico/contracts/ui-contracts.md`. Nenhuma rota do site nem da API muda.

## Condição de layout

| Nome | Regra |
|---|---|
| Layout de computador (jogo) | `!(pointer: coarse or max-width: 720px)` **e** `(min-width: 861px)` (`useDesktopLayout`) |
| Layout de computador (biblioteca) | `(min-width: 861px)` |
| Tudo o mais | layout da feature 010, sem mudança e sem alças |

## Chaves de armazenamento novas

| Chave | Área | Valor | Dono |
|---|---|---|---|
| `cruzadinha:board-size` | `localStorage` | `{"cellSize": <30..110>}` | `features/game/board-size.ts` |
| `cruzadinha:library-width` | `localStorage` | `{"width": <720..1600>}` | `features/library/library-width.ts` |

## Alça de redimensionar (`components/ResizeHandle.tsx`)

| Aspecto | Contrato |
|---|---|
| Papel | `role="slider"`, `aria-orientation="horizontal"`, `tabIndex=0` |
| Valores | `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext` |
| Teclado | ← ou ↓: −step; → ou ↑: +step; Home: mínimo; End: máximo; cada tecla grava a escolha |
| `decorative` | sem `role` nem `aria-value*`, `aria-hidden="true"`, `tabIndex=-1`, sem teclado; só desenho e ponteiro |
| Mouse e caneta | arrastar com o botão principal muda o valor ao vivo; soltar, cancelar ou perder a captura grava o último valor válido |
| Clique duplo | apaga a escolha e volta ao padrão |
| Alvo | 44 × 44 px (`corner`) ou faixa de 44 px de largura na altura toda (`edge`) |
| Visual | só tokens: `--mute` em repouso, `--accent` no hover e no foco; foco visível; contraste de 3:1 nos dois temas |
| Cursor | `nwse-resize` (`corner`) e `ew-resize` (`edge`); `touch-action: none` |

## Tela de jogo no computador

```text
Toolbar  [tempo] [pausa] | [calendário] | [Tamanho padrão] [salvamento] … [ajudas]
Corpo (bloco centralizado)
├── section "Tabuleiro"  (largura = grade)
│   ├── barra da dica ativa  [‹ Dica anterior]  "1 H. texto"  [Próxima dica ›]   (ou faixa do modo leitura)
│   └── grade  ◢ alça no canto inferior direito (slider "Tamanho do tabuleiro")
└── aside "Dicas"  (≤ 560 px, mesma altura da section, fixa ao rolar)
    ├── Horizontais (rola por dentro, título fixo)
    ├── Verticais   (rola por dentro, título fixo)
    └── atribuição à fonte
```

| Elemento | Nome acessível | Comportamento |
|---|---|---|
| Alça do tabuleiro | "Tamanho do tabuleiro"; `aria-valuetext` "Tamanho do tabuleiro N de M" (+ ", padrão") | min 30, max `maxCellSize`, step 10 no teclado; o canto acompanha o ponteiro; depois de arrastar com o mouse o foco volta ao tabuleiro; oculta na pausa |
| Tamanho padrão | "Tamanho padrão" | apaga a escolha; `disabled` sem escolha |
| Dica anterior / Próxima dica | esses textos | `previousWord` / `nextWord`; o foco volta ao tabuleiro |

A grade recebe `--cell-size: Npx` inline só quando a medida existe. Sem medida (jsdom), vale o CSS da feature 010.

## Biblioteca no computador

| Elemento | Nome acessível | Comportamento |
|---|---|---|
| Alça do calendário (borda direita) | "Largura do calendário"; `aria-valuetext` "Largura do calendário N de M" (+ ", automático") | min 720, max `min(1600, largura disponível)`, step 40 no teclado; a borda acompanha o ponteiro; a coluna inteira da biblioteca (título, aviso, mês, legenda) assume a largura |
| Pegada de canto (inferior direito) | `ResizeHandle decorative`: sem `role`, `aria-hidden="true"`, `tabIndex=-1` | mesmo arraste da borda; sem teclado |

Os dias, números e textos crescem com a largura do calendário (unidades de contêiner). A altura do dia continua limitada para seis semanas caberem em 1080 px.

## Tabuleiro: teclado e aparência (FR-023 a FR-027, todas as telas)

Teclas com o foco na grade (`role="grid"`, uma única parada de tabulação). Ctrl, Alt e Meta passam para o navegador; em modo leitura nada muda.

| Tecla | Ação do reducer | Efeito |
|---|---|---|
| Tab / Shift+Tab | `nextWord` / `previousWord` | próxima ou anterior palavra, dando a volta na lista; o foco fica na grade |
| Esc, depois Tab / Shift+Tab | — | o Tab segue o fluxo normal e sai da grade; outra tecla ou `blur` cancela o Esc |
| Backspace | `backspace` | apaga e volta uma célula (feature 010) |
| Delete | `delete` | apaga a letra da célula selecionada sem mover; vazia ou travada não muda; tira a marca `wrong` |
| Home / End | `wordStart` / `wordEnd` | primeira e última célula da palavra ativa, sem mudar a direção; sem rolar a página |

A grade tem `aria-describedby` para um `<p hidden>`: "Tab e Shift+Tab mudam de palavra. Delete apaga a letra sem mover; Home e End vão ao início e ao fim da palavra. Para sair do tabuleiro, aperte Esc e depois Tab."

| Elemento | Aparência |
|---|---|
| Número da dica na lista | negrito, na cor do texto da dica, seguido de "." (`::after`), a 0,35em do texto; a segunda linha começa embaixo dele |
| Texto da lista | 16 px no celular, 17 px no computador (`.fill`) |
| Títulos "Horizontais" e "Verticais" | 14 px, negrito, `--ink`, fixos no topo da coluna |
| Letra da célula | `0.7 × --cell-size`, caixa só da maiúscula (`text-box: trim-both cap alphabetic`), deslocada `0.06 × --cell-size` para baixo |
| Número da célula | negrito, `max(8px, 0.24 × --cell-size)` |
| Células dos cantos | raio `--radius-sm − 2px` (o recuo da grade) |
| Barra de rolagem | fina, `--scrollbar` sobre transparente (≥ 3:1 sobre `--bg` e `--surface` nos dois temas); no Safari, pela regra `::-webkit-scrollbar` |

## Medidas de aceitação (Playwright)

Viewport 1920 × 1080, sem preferências guardadas, cruzada 11 × 11 do seed:

| Medida | Esperado |
|---|---|
| Base da grade com `scrollY = 0` | ≤ 1080 |
| Largura do `aside` "Dicas" | ≤ 576 px (30% de 1920) |
| Margem esquerda do bloco − margem direita | ≤ 2 px |
| Célula no padrão | ≥ 72 px (mockup aprovado: 74 px; SC-002) |
| Estreitar para 900 px e alargar de volta para 1920 px | tamanho e largura escolhidos voltam; chaves guardadas iguais |
| Arrastar a alça do tabuleiro até o fim, recarregar | célula = `max` (±1 px) |
| Arrastar a alça do calendário até o mínimo, recarregar | calendário = 720 px (±1 px) |
| Arrastar além dos limites | calendário entre 720 e 1600 px; célula entre 30 e o `max` |
| Só teclado nas duas alças | valor muda e `aria-valuetext` acompanha |
| `document.documentElement.scrollWidth` | = largura da janela (861 a 2560 px, qualquer escolha) |
| Calendário no ajuste automático | ≥ 1,5 × a largura da feature 010 e ≤ 1600 px; seis semanas com base ≤ 1080 |
| Celular 360 × 740 (toque) | sem alças; célula, grade e calendário com as mesmas medidas da feature 010, registradas antes da mudança |
| Calendário em 720 px | texto da situação de cada dia sem corte (`scrollWidth ≤ clientWidth`) |
| Foco na grade: Shift+Tab, Tab; depois Esc, Tab | a grade continua com o foco; depois o foco vai à alça "Tamanho do tabuleiro" |

"Janela de 1920 × 1080" é a área visível da página (`viewport`), como no `test.use({ viewport })`.

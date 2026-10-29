# UI Contract: landing (`/`)

Não há contrato de API. Este arquivo fixa o que a página entrega para testes e para o buscador. Os textos são os do mockup; onde há contagem de fontes, o número é calculado.

## Landmarks e títulos

| Nível | Texto | Observação |
|---|---|---|
| `h1` (único) | "Cruzadinha: Palavras cruzadas todo dia, sem cadastro e sem pressa." | "Cruzadinha: " escondido da tela; "todo dia" dentro de `<em>` |
| `h2` | "Abriu, jogou. O resto é opcional." | seção "Como funciona" |
| `h3` (3) | "Sem conta para começar" · "Uma cruzada por dia, de {N} fontes" · "Funciona até sem internet" | `N` = por extenso, de `puzzleSourceIdSchema` |
| `h2` | "Uma mini cruzada, bem aqui." | seção "Experimente" |
| `h3` (2) | "Horizontais" · "Verticais" | listas de dicas |
| `h2` | "{N} fontes, um só lugar." | `N` calculado (ex.: "4 fontes, um só lugar.") |
| `h3` (por fonte) | nome da fonte | `puzzleSourceNames` |
| `h2` | "A cruzada de hoje já está esperando." | faixa final |

Rótulos (`kicker`, texto simples, não são títulos): "Como funciona", "Experimente", "Fontes".

## Ações

| Texto | Destino |
|---|---|
| "Jogar a cruzada de hoje" | `/jogar` |
| "Experimentar aqui" | âncora `#mini-cruzada` (rolagem suave, direta com movimento reduzido) |
| "Jogar agora" | `/jogar` |
| link do calendário (faixa final) | `/calendario` |
| "Limpar" | volta a mini cruzada ao estado inicial (3 letras) |

## Pílulas (lista)

"Modo lápis para rascunhar" · "Atalhos de teclado (tecle ?)" · "Tema claro e escuro" · "Tabuleiro que se ajusta à tela" · "Cronômetro que pausa sozinho".

## Mini cruzada

- `role="grid"` rotulado "Mini cruzada 5 por 5"; `aria-activedescendant` na casa selecionada (como na 048).
- Teclas: letras, setas, Backspace, Delete, Home, End, Tab/Shift+Tab (próxima/anterior palavra; fora da grade na primeira/última, sem armadilha).
- Área de status (`role="status"`): "N de 6 palavras certas." e, completa, "Resolvida! Amanhã tem outra." com o convite a jogar a cruzada de hoje.
- Dica por item: botão dentro de `li`; palavra resolvida com `✓` e texto riscado.
- Nada é enviado, lido ou salvo fora da página.

## Não entram

"Prévia de design", botões com `href="#"`, lista fixa de fontes, logo "C" e "Jogar hoje" do mockup, link do Google Fonts.

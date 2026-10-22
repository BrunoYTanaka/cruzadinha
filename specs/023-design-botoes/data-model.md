# Data Model: Botões que parecem botões, distintos dos links

Nenhum dado muda: nada é salvo, enviado nem lido da API, das configurações ou do IndexedDB. O "modelo" desta feature é o vocabulário visual dos controles.

## Tokens de tema (novos)

Definidos em `apps/web/src/themes/light.css` e nos dois blocos de `dark.css`, listados no comentário de `tokens.css`. Valores e contrastes em [research.md](research.md) (R5).

| Token | Papel |
| --- | --- |
| `--control` | fundo do botão secundário |
| `--control-line` | contorno de secundário (inclusive pílulas, passos − e + e tema) e discreto; ≥ 3:1 com `--bg` e `--surface` |
| `--hover-overlay` | camada translúcida do estado "mouse por cima" |
| `--press-overlay` | camada translúcida do estado "pressionado" |

## Tipos de botão (`Button` e `buttonClass`)

`variant: 'primary' | 'secondary' | 'quiet' | 'icon'`. O padrão é `'secondary'` e substitui o antigo `'default'`. `'quiet'` substitui `'ghost'`.

`size?: 'regular' | 'small'`, padrão `'regular'`; `small` é o "Tamanho padrão" do jogo.

`block?: boolean`, sem mudança.

| Tipo | Repouso | Mouse por cima | Pressionado | Desativado |
| --- | --- | --- | --- | --- |
| principal | fundo `--accent`, texto `--accent-ink`, borda `--accent` | + `--hover-overlay` | + `--press-overlay` | opacidade 0,6, sem mudança de estado |
| secundário | fundo `--control`, borda `--control-line`, texto `--ink` | + `--hover-overlay` | + `--press-overlay` | idem |
| discreto | transparente, borda `--control-line`, texto `--ink` | + `--hover-overlay` | + `--press-overlay` | idem |
| ícone | transparente, borda transparente | + `--hover-overlay` | + `--press-overlay` | idem |

Valem para todos os tipos:

- O foco usa o `:focus-visible` global (3 px `--focus`, deslocado 2 px) em qualquer estado.
- O mouse por cima só existe com `(hover: hover)`.
- A transição é de 120 ms, anulada quando a pessoa pede menos movimento.

## Controles com estado próprio

| Controle | Estado que manda | Acréscimo |
| --- | --- | --- |
| aba de fonte | `.selected` (superfície e marca `--accent` no topo) | sobreposição de mouse e pressionado sobre o fundo atual |
| segmento da cruzada padrão | `aria-pressed="true"` (superfície com sombra) | idem |
| chave liga/desliga | `aria-checked` (trilho `--line` ou `--accent`) | idem no trilho |
| linha da lista de dicas | `.active` (`--word`), `.done` (`--ok-tint`) | mouse por cima só na linha sem `.active` e sem `.done`; pressionado em todas |
| tecla do teclado na tela | — | pressionado |
| dia do calendário e cartão "Hoje" (links) | estado do dia ou do cartão | mouse por cima: borda `--accent`; pressionado: `--press-overlay` |

## Links

| Situação | Repouso | Mouse por cima | Pressionado |
| --- | --- | --- | --- |
| link de texto | `--accent`, sublinhado 1 px, deslocado 3 px | sublinhado 2 px | sublinhado 2 px e texto `--ink` (sem sobreposição de fundo) |
| link com aparência de botão (conclusão, "Entrar" do cabeçalho) | tipo de botão completo, sem sublinhado | do tipo | do tipo |
| link de controle (voltar na barra do jogo) | tipo ícone | do tipo | do tipo |
| marca do cabeçalho | `--ink`, sem sublinhado | cor `--accent` | sem acréscimo |

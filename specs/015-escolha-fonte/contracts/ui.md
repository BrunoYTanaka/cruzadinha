# UI contracts: Escolha da fonte mais visível

O site é a única interface que muda. A API não muda (contrato da feature 014, `specs/014-adaptador-publico/contracts/api.md`). Mockup: https://claude.ai/artifact/F4cAndr5GyavzEUiTdYb9B (alternativa A).

## 1. Biblioteca (`/`)

Ordem na página:

1. `h1` "Hoje" e a data por extenso ("segunda-feira, 19 de outubro").
2. Seção dos cartões (`aria-labelledby` do `h1`): um cartão por fonte, na ordem da lista.
3. Abas de fonte e, logo abaixo, o calendário como painel da aba ativa.
4. Aviso de fonte fora do ar da aba ativa (feature 014), legenda do calendário.

O botão "Jogar a de hoje" e o seletor de botões da feature 014 deixam de existir.

### Cartão

| Situação | Elemento | Conteúdo visível |
| --- | --- | --- |
| Com destino | `<a>` (Link) do tamanho do cartão, alvo mínimo 44 px | nome da fonte, pílula de estado, ação ("Jogar", "Continuar", "Ver") |
| Sem destino (sem cruzada, fonte fora do ar sem puzzle guardado) | `<div>` | nome da fonte, texto do estado |
| Carregando | `<div aria-busy="true">` | nome da fonte, "Carregando…" |
| Erro | `<div>` | nome da fonte, "Não foi possível carregar.", `<button>` "Tentar de novo" |

- Nome acessível do link: `"{nome}: {estado falado}. {ação}"`, por exemplo "Cruzada Online: concluída em 16 minutos e 27 segundos. Ver".
- Estados por texto e símbolo, nunca só por cor (tokens `--ok`/`--ok-tint`, `--warn`/`--warn-tint`, `--pill`).
- Layout (FR-016): uma linha com `--source-count` colunas a partir de 600 px; uma coluna abaixo.

### Abas

- `div role="tablist" aria-label="Fonte do calendário"`; cada aba `button role="tab" id="source-tab-{id}" aria-controls="source-panel" aria-selected`.
- Só a aba selecionada tem `tabindex="0"`; as outras `-1`.
- Teclado: ← / → trocam e ativam a aba vizinha (com volta), Home / End a primeira / última. Clique ativa.
- Conteúdo: nome em negrito e, quando a biblioteca da fonte carregou, "{n} concluída(s)" do mês exibido.
- O calendário fica em `section id="source-panel" role="tabpanel" aria-labelledby="source-tab-{ativa}" aria-describedby="calendar-title"` (o nome do painel é o da aba; o mês, `h2#calendar-title`, entra como descrição).
- Trocar de aba guarda `cruzadinha:source`, mantém o mês e não navega.
- Celular (< 600 px): as abas dividem a largura numa linha.

## 2. Tela do jogo (`/jogo/:puzzleId`)

- `h1` visível no começo da faixa de ferramentas (antes ficava só para leitores de tela): `<span class="source">{nome da fonte}</span>` (pílula visual, fundo `--pill`; não é o componente `Pill`, que é botão) seguido de "{dia} de {mês}" (o "Cruzada de" fica só para leitores de tela, para a faixa caber numa linha no computador). Leitura: "O Globo Cruzada de 18 de outubro". A faixa já quebra linha em telas estreitas e o tabuleiro se ajusta ao espaço medido.
- Título do documento: "Cruzada de {dia} de {mês} · {nome da fonte}".
- Linha de atribuição sem mudança.

## 3. Diálogo de conclusão

Props novas: `otherSource?: { name: string; href: string }`.

| Com `otherSource` | Sem `otherSource` |
| --- | --- |
| Texto "Também há cruzada deste dia em {nome}." | Igual a hoje |
| Botão primário "Jogar {nome} deste dia" (Link para `href`, foco inicial) | Primário "Voltar à biblioteca" (foco inicial) |
| Secundários "Voltar à biblioteca" e "Ver o tabuleiro" | Secundário "Ver o tabuleiro" |

O atalho só aparece quando a biblioteca da outra fonte já carregou (regra em data-model §5); nada bloqueia o diálogo enquanto ela carrega. Na tela do jogo, as bibliotecas só são pedidas quando a cruzada é concluída (em geral já estão em cache, vindas da biblioteca); se chegarem depois de o diálogo abrir, o atalho aparece sem mover o foco.

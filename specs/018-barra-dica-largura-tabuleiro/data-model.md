# Data Model: Barra da dica com a largura do tabuleiro

Nenhuma entidade, tabela, schema ou chave de armazenamento nova ou alterada. A API, os dados de progresso (conta e visitante) e as preferências do aparelho (`cruzadinha:board-size`, `cruzadinha:library-width`, `cruzadinha:source`) ficam como estão.

Os valores novos são de layout e interação, não de dados:

| Nome | Onde | Valor | Uso |
| --- | --- | --- | --- |
| `--clue-bar-min` | `GamePage.module.css`, em `.desktop` | `320px` | Largura mínima da barra da dica e da faixa de modo leitura no computador (FR-004) |
| `HOVER_DELAY_MS` | `ClueBar.tsx` | `500` | Tempo com o mouse parado sobre a dica cortada antes do balão abrir (FR-010) |

O estado do balão (`openFor: string | null`, a `wordKey` da palavra para a qual ele abriu) vive só no componente `ClueBar` e não é guardado.

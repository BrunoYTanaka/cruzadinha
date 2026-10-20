# Data Model: Dica no meio da altura da barra, balão acima da barra e dica resolvida riscada

Nenhuma entidade, tabela, schema ou chave de armazenamento nova ou alterada. A API, os dados de progresso (conta e visitante) e as preferências do aparelho (`cruzadinha:board-size`, `cruzadinha:library-width`, `cruzadinha:source`, `cruzadinha:theme`) ficam como estão. A regra de quando uma dica está resolvida (`isWordSolved`/`struckWords`, feature 016) não muda.

Os valores novos são de layout e de estado local do componente, não de dados:

| Nome | Onde | Valor | Uso |
| --- | --- | --- | --- |
| deslocamento ótico | `ClueBar.module.css`, `.navigable .live` | `translate: 0 -1px` | Sobe número e dica até o meio das minúsculas ficar no meio da barra (FR-001, research R2) |
| `placement` | estado de `ClueBar` | `'above'` (padrão) ou `'below'` | Lado da barra em que o balão abre; volta a `'above'` a cada abertura e vira `'below'` quando o balão não cabe acima; só tem efeito na barra do computador (`.navigable`), porque na barra sem botões o balão já fica abaixo (FR-015, FR-016) |
| risco da dica resolvida | `ClueList.module.css`, `.done` | `line-through`, 1 px | Risca número e texto da dica resolvida nas colunas de dicas (FR-010) |

`placement` vive só em `ClueBar`, ao lado de `openFor` (feature 018), e não é guardado.

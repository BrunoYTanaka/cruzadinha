# Data Model: Escolha da fonte mais visível

Sem mudança no banco, na API nem em `packages/shared`. Tudo abaixo é derivado no site, a partir da biblioteca por fonte (features 009, 013 e 014) e das marcas locais da feature 014.

## 1. Fonte disponível

| Campo | Origem | Regra |
| --- | --- | --- |
| `id` | `puzzleSourceIdSchema.options` (`shared`) | A ordem da lista é a ordem dos cartões, das abas e do atalho. |
| `name` | `puzzleSourceNames[id]` (`shared`) | Único texto exibido por fonte. |

Fonte padrão: a primeira da lista (R10). Limite de layout: 1 a 3 fontes (FR-016).

## 2. Biblioteca por fonte (estado de carga)

Uma consulta por fonte (R1), chave `['library', viewerKey, source]`. Na tela do jogo, as consultas só são ligadas quando a cruzada é concluída (R9).

| Estado | Efeito |
| --- | --- |
| `pending` | Cartão em esqueleto; se for a fonte ativa, o calendário mostra o carregamento. |
| `error` | Cartão com "Não foi possível carregar" e "Tentar de novo" (`refetch`); se for a fonte ativa, o calendário mostra o erro com nova tentativa. A outra fonte não é afetada. |
| `success` | Itens filtrados por `item.source === source` (R11). |

## 3. Cartão de hoje (`TodayCard`)

Derivado por `todayCard(source, items, today, { down, noPuzzle })`, com o estado do dia vindo de `dayState` (o mesmo do calendário).

| `kind` | Texto do estado | Ação | Destino |
| --- | --- | --- | --- |
| `not_started` | "Não iniciada" | "Jogar" | `/jogo/:puzzleId` |
| `in_progress` | "◐ Em jogo · mm:ss" (`elapsedMs`; sem tempo se nulo) | "Continuar" | `/jogo/:puzzleId` |
| `completed` | "✓ Concluída · mm:ss" (`finishedMs`; sem tempo se nulo) | "Ver" | `/jogo/:puzzleId` |
| `fetchable` | "Ainda não guardada" | "Jogar" | `/dia/:today?fonte=:source` |
| `fetchable` com fonte fora do ar | "Fonte fora do ar agora" | nenhuma | sem link |
| `none` | "Sem cruzada hoje" | nenhuma | sem link |

`future` não ocorre para hoje. Os textos ficam também no nome acessível, com o tempo falado (`spokenElapsed`).

## 4. Resumo do mês por fonte

`completedInMonth(items, { year, month })` = quantidade de itens da fonte com `status === 'completed'` e data no mês exibido. Texto da aba: "1 concluída" / "N concluídas" (0 inclusive: "0 concluídas"). Durante carga ou erro da fonte, a aba mostra só o nome.

## 5. Atalho de conclusão (`OtherSourceShortcut`)

`otherSourceShortcut(current, date, today, libraries, noPuzzle)` → `{ source, name, href } | null`.

- Percorre as fontes na ordem da lista, sem a atual.
- Ignora fontes com biblioteca em carga ou com erro.
- Aceita a primeira com estado do dia `not_started`, `in_progress` ou `fetchable` (este só se a fonte não estiver fora do ar).
- `completed`, `none` e `future` não geram atalho.
- `href`: `/jogo/:puzzleId` para guardado, `/dia/:date?fonte=:source` para buscável.

## 6. Preferências no aparelho

| Chave | Mudança |
| --- | --- |
| `cruzadinha:source` | Nenhuma no formato; agora é a aba escolhida. Valor fora da lista volta à primeira fonte. |
| `cruzadinha:source-down:<source>`, `cruzadinha:no-puzzle:<source>:<date>` | Nenhuma; passam a ser lidas também pelos cartões e pelo atalho. |

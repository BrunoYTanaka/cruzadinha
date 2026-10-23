# Data Model: Adaptador da fonte Cruzadas Brasil

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

## 1. Formato interno (`shared`)

Sem mudança de estrutura. `puzzleSourceIdSchema` passa a `z.enum(['oglobo', 'cruzadaonline', 'cruzadasbrasil'])` e `puzzleSourceNames` ganha `cruzadasbrasil: 'Cruzadas Brasil'`. A ordem do enum define a ordem das abas, dos cartões e do seletor (a nova fonte vem por último) e que a primeira continua sendo a padrão.

## 2. Tabela `puzzles`

Sem coluna nova. Migração `0006_puzzles_source_cruzadasbrasil` (gerada por `drizzle-kit generate`, nunca `push`):

```sql
ALTER TABLE "puzzles" DROP CONSTRAINT "puzzles_source_check";
ALTER TABLE "puzzles" ADD CONSTRAINT "puzzles_source_check" CHECK ("puzzles"."source" IN ('oglobo', 'cruzadaonline', 'cruzadasbrasil'));
```

`puzzleSources` e o `check()` de `src/db/schema.ts` mudam juntos. Reversão: voltar à lista de duas fontes só é possível se não houver linha da nova fonte. Um puzzle por `(source, level, date)` continua único. DDE-002 e ERD-002 listam os valores permitidos de `source` e são atualizados.

## 3. Dados do jogo (entrada do adaptador, não persistida)

| Campo | Tipo | Regra |
|-------|------|-------|
| `id` | string `AAAAMMDD` | igual à data pedida |
| `titulo` | string, opcional | vira `attribution.title`; ausente/vazio → `null` |
| `nivel` | string | `"Diário"` → `daily`; outro valor → `unsupported` |
| `dimensoes` | `{ linhas, colunas }` inteiros 1 a 30 | iguais às dimensões do gabarito |
| `dicas` | `{ horizontais, verticais }`, cada uma lista de `{ numero, dica }` | número inteiro positivo, sem repetição na direção, dica não vazia depois da limpeza |
| `posicoes_num` | lista de `{ numero, x, y }` | `x` = coluna, `y` = linha, base 0; um por número calculado |
| `gabarito` | matriz `linhas x colunas` de strings | `#` = bloco; senão uma letra |

Campos extras são ignorados.

## 4. Conversão (função pura)

Entrada: dados validados, nível, data. Saída: `FetchPuzzleSuccess` (puzzle + solução + `dates: []`) ou `unexpected-format`/`unsupported`.

1. Grade: `#` → `{ kind: 'block' }`; letra → `{ kind: 'open', number }`; solução recebe a letra em maiúscula (pt-BR, NFC).
2. Palavras: para cada célula aberta em ordem de leitura, é início horizontal se não há aberta à esquerda e há à direita, e vertical se não há aberta acima e há abaixo; início de qualquer direção recebe o próximo número. O tamanho é a corrida de células abertas.
3. Conferências (qualquer falha → `unexpected-format`): os números calculados batem com os de `dicas` por direção (conjunto e unicidade) e com `posicoes_num` (número, coluna, linha); toda palavra tem dica e toda dica tem palavra; dimensões batem; cada célula é bloco ou letra única; depois, `puzzleSchema` e `validatePuzzleWithSolution` (já existentes).
4. Atribuição: `sourceName` "Cruzadas Brasil", `title` da fonte ou `null`, `author` `null`, `copyright` `null`.

O detalhe de erro leva só coordenadas, números e contagens, nunca letras nem texto de dica.

## 5. Estados

Nenhuma máquina de estados nova. Os resultados do adaptador seguem `FetchPuzzleResult`; progresso, biblioteca e coleta usam as transições das features 006 a 009.

## 6. Navegador

Sem chave nova. `cruzadinha:settings.defaultSource` aceita `cruzadasbrasil` (validado só por formato) e lê fonte desconhecida como a primeira.

# Contrato: adaptador `clube`

Implementa `PuzzleSource` (`apps/api/src/sources/types.ts`) com duas extensões opcionais, sem quebrar `oglobo` e `cruzadaonline`:

```ts
interface PuzzleSource {
  readonly id: PuzzleSourceId
  readonly onDemand?: boolean // default true; clube = false
  fetchPuzzle(level: Level, date: string): Promise<FetchPuzzleResult>
  /**
   * Edições da mais nova para a mais antiga. Entrega primeiro a página (data, autor, link
   * anterior); `loadPuzzle()` pede o script e converte. A coleta só chama `loadPuzzle()` quando a
   * data ainda não está salva.
   */
  listRecent?(opts: { oldestDate: string }): AsyncIterable<EditionPage>
}
```

## `fetchPuzzle(level, date)` para `clube`

Não busca por data na fonte: devolve `unavailable` (`onDemand = false`). A coleta usa `listRecent`.

## `listRecent`

Pedidos por coleta: 1 (categoria) + 1 por edição visitada + 1 por edição não salva (script).

1. Pede a categoria de cruzadas clássicas, pega o primeiro link `/jogo/i/…`.
2. Para cada página: pede a página e depois o script; lê data/autor/script/anterior (`page.ts`), extrai o XML (`sandbox.ts`), converte (`convert.ts`) e valida (`puzzleSchema` + par com solução).
3. Para quando: data mais antiga que a janela (`oldestDate`), sem link anterior, ciclo de links ou falha (a falha é entregue como último item). A coleta não para na primeira edição já salva: percorre toda a janela, para preencher lacunas de uma execução interrompida (uma edição salva custa só o pedido da página).

```ts
type EditionPage = { date: string; author: string | null; loadPuzzle(): Promise<FetchPuzzleResult> }
```

## Motivos

| Situação | Motivo |
|----------|--------|
| 403 / 404 | `unavailable` |
| 429 | `rate-limited`, sem nova tentativa |
| 5xx, rede, tempo limite 10 s | `source-down` |
| página sem data / sem script / sem variável / XML inválido / estrutura alterada / sandbox estourou tempo, memória ou pilha / corpo > 1 MB | `unexpected-format` |
| recurso válido não suportado (célula com mais de uma letra) | `unsupported` |

## Sandbox

- Runtime QuickJS novo por chamada; memória 32 MB, pilha 512 KB, prazo 1 s; nenhuma função do host; sem `import`.
- Saída aceita: `CrosswordPuzzleData` do tipo `string`, ≤ 1 MB.
- Nunca registrar o script nem o XML; `detail` traz só nomes de campo/códigos.

## Atribuição

`{ sourceName: 'Cruzadas Clube', title: 'Cruzadas clássicas <n>', author: <autor>, copyright: null }`.

## Fixtures

Reduzidas (grade 4 x 3 ou similar) e inventadas, em `sources/clube/fixtures/`: página válida, página sem data, script ofuscado simples que monta a variável por tabela de strings, script sem variável, script com laço infinito, script que tenta `fetch`/`require`/`process`, XML mal formado, estrutura alterada, barra sem palavra do outro lado, corpo grande.

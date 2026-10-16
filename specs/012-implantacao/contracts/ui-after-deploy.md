# Contrato de UI: aba aberta depois de publicar o site (FR-024)

Desenho em research R15.

## Comportamento

| Situação | O que acontece |
|---|---|
| Uma aba carregada antes da publicação abre uma tela carregada sob demanda (a cruzada), e o arquivo antigo não existe mais | O Vite emite `vite:preloadError`. O site grava em `sessionStorage` (`cruzadinha:reloaded-after-deploy`) o caminho e o instante, chama `event.preventDefault()` e recarrega a página no mesmo endereço. |
| Depois do recarregamento, a mesma falha se repete em menos de 30 s, no mesmo caminho | Não recarrega de novo. O erro segue para o `RouteError`, que mostra "Algo deu errado" com "Tentar de novo" (feature 010). |
| A falha acontece de novo depois de 30 s (outra publicação) | Recarrega uma vez de novo. |
| `sessionStorage` indisponível (bloqueado ou cheio) | Não recarrega. Mostra o erro de sempre, nunca entra em laço. |
| Partida em andamento | Não é afetada: o código do jogo já está carregado. As letras não enviadas ficam na fila do aparelho (feature 010) e são enviadas depois do recarregamento, se houver um. |

## Função pura

`shouldReloadAfterChunkError(previous: unknown, path: string, now: number): boolean` em `apps/web/src/app/reload-after-deploy.ts`.

- O valor anterior entra como `unknown` e passa por Zod (`{ path: string, at: number }`).
- Devolve `true` quando não há registro, quando o registro é de outro caminho ou quando tem 30 s ou mais.

## Cabeçalhos (`apps/web/public/_headers`)

- `/` e `/index.html`: `Cache-Control: no-cache`, para o navegador sempre conferir o HTML (documentação do Vite).
- `/version.json`: `Cache-Control: no-store`.
- `/*`: `X-Robots-Tag: noindex, nofollow` (R9, sem mudança).

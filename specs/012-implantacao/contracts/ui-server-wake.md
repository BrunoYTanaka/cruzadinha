# Contrato de UI: espera do servidor

## Onde vale

- **Vale**: todas as rotas do site, exceto `/status`. A rota sem caminho que as envolve tem o loader `serverReadyLoader`.
- **Não vale**: a tela de jogo depois de carregada (FR-011). Ali continuam os avisos que não bloqueiam e a fila de salvamento da feature 010.

## `<ServerWake />` (fallback da carga inicial)

| Tempo desde o início da espera | O que aparece |
|---|---|
| 0 a 2 s | o `LoadingState` atual, sem texto de espera, para não piscar com a API acordada |
| a partir de 2 s | título "Acordando o servidor", texto "O servidor dorme quando ninguém está jogando. A primeira visita pode levar até um minuto.", indicador de progresso e o tempo decorrido ("Esperando há 12 s") |
| 90 s sem sucesso | troca para o erro: "Não foi possível falar com o servidor." e o botão "Tentar de novo" |

- O texto fica num contêiner `role="status"` (`aria-live="polite"`). O tempo decorrido é atualizado na tela, mas fora da região viva, para o leitor não anunciar a cada segundo.
- "Tentar de novo" chama `router.revalidate()` sem recarregar a página. Como o `HydrateFallback` não aparece em revalidações (research R11), o `RouteError` mostra o próprio `<ServerWake />` enquanto `useRevalidator().state === 'loading'`, com a contagem recomeçando do zero, e o foco vai para o título da espera.
- Ao ficar pronto, o router segue para a rota do endereço original (caminho, `?next=` e outros parâmetros preservados), e o foco segue a regra de troca de tela da feature 010.
- O indicador é animado só sem `prefers-reduced-motion: reduce`. Com essa preferência, fica estático e o tempo decorrido continua mudando.
- As cores e medidas vêm só dos tokens, nos temas claro e escuro, com contraste de 4,5:1 no texto e 3:1 no indicador.

## `LoadingState` durante a navegação

- Se algum pedido sem `keepalive` estiver em andamento há 2 s ou mais, o `LoadingState` mostra "Acordando o servidor…" com o texto curto "Pode levar até um minuto." no lugar do texto de carregamento.
- Quando o pedido termina, a tela segue o fluxo normal: conteúdo ou o erro já existente.

## Textos

Todos em português, sem jargão técnico ("servidor", nunca "API" ou "cold start").

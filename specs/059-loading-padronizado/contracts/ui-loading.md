# Contrato de interface: espera padronizada

## `LoadingState`

`<LoadingState screen? level? immediate? focusOnMount? />`

- `screen`: `LoadingScreen`, padrão `entry`. Define título e palavra das casas.
- `level`: `1 | 2 | undefined`. `1` = página inteira (`h1`); `2` = `h2`; ausente = `p` (dentro de página com `h1`).
- `immediate`: mostra a mensagem, a barra e o contador já na montagem.
- `focusOnMount`: leva o foco ao título (exige `level`).
- Fica lento por `useSlowServer().slow` ou por 2 s montado. Título, casas e posição não mudam ao ficar lento.
- Casas `aria-hidden`; a mensagem entra num `role="status"`; movimento reduzido pára casas e barra.

## `SlowNotice`

`<SlowNotice active />`: mostra a mensagem da soneca com `role="status"` num bloco de altura reservada; vazio quando `active` é `false`.

## `Button`

`pending?: boolean`: `disabled`, `aria-busy="true"`, spinner antes do texto, largura travada enquanto `pending`. Sem `pending` o componente é igual ao de hoje.

## `PlayLink` (features/landing)

`<PlayLink to variant? size? className? children pendingLabel="Abrindo…" />`: `Link` de `react-router`; com `variant` usa `landingButtonClass`, sem ela só a `className` recebida (o link "Ver o calendário" tem estilo próprio); no primeiro clique mostra `pendingLabel`, `aria-busy`, ignora cliques seguintes e, 2 s depois, mostra o `SlowNotice` na linha reservada.

## Fora do contrato

Nenhuma rota, cabeçalho HTTP, schema ou endpoint muda.

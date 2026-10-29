# Quickstart: Menos avisos e botões no calendário e no jogo

Pré-requisitos: `npm ci`; para ver no navegador, Postgres e `npm run db:seed -w @cruzadinha/api`, depois `npm run dev -w @cruzadinha/api` e `npm run dev -w @cruzadinha/web`.

## Automático

```sh
npm run lint
npm run typecheck
npm test
```

O e2e (`npm run test:e2e -w @cruzadinha/web`, precisa de API e Postgres) cobre `offline.spec.ts` e `sem-saltos.spec.ts`.

## Manual

1. **Aviso (US1)**: como visitante, jogue e deixe um save de conta na fila (ou crie `cruzadinha:outbox:u1:p1` no `localStorage`). Abra `/`, `/calendario` e um jogo: nenhuma faixa "Há progresso esperando você entrar.".
2. **Descarte (US1)**: entre numa conta com a fila de outra: o aviso de descarte aparece com "Fechar".
3. **Ajudas (US2)**: abra um jogo; "Ajudas" tem o mesmo formato dos vizinhos "Letra" e "Palavra", com o texto centrado; ligue "Verificar ao digitar": o ponto aparece no canto e nada se move.
4. **Calendário (US3)**: `/calendario` sem o botão de baixar; abra uma cruzada, fique sem rede (DevTools), recarregue: ela abre; o cartão mostra "Disponível sem rede".

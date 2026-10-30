# Quickstart: Filtros no calendário por status

## Pré-requisitos

`nvm use`, `npm ci`.

## Testes

```sh
cd apps/web
npx vitest run src/features/library src/pages/library
cd ../.. && npm run typecheck && npm run lint   # lint inclui check:deps
```

Esperado: helper (regras e contagens), `StatusFilter` (`aria-pressed`, axe), `DayCell` (dia apagado = texto inoperante com "fora do filtro"), `LibraryPage` (filtro persiste ao trocar mês e fonte).

## Conferência manual

1. `docker compose up -d`, `npm run db:seed -w @cruzadinha/api`, `npm run dev -w @cruzadinha/api` e `npm run dev -w @cruzadinha/web`.
2. Abrir `/calendario`, deixar um dia pela metade e concluir outro.
3. Escolher cada filtro: só os dias do status ficam abríveis; as contagens batem; a região de status anuncia "N dias …"; filtro vazio mostra "Nenhum dia neste mês com esse status."; com "Todas" nada aparece ali e a contagem não inclui dias a buscar na fonte.
4. Trocar de mês e de fonte: o filtro continua marcado. Recarregar: volta a "Todas".
5. Só teclado: Tab chega aos filtros; dias apagados não recebem foco.

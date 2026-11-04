# Quickstart: validar o calendário enxuto

Pré-requisitos: Node 24 (`nvm use`), `npm ci`.

## Automático

```sh
npm run typecheck && npm run lint
npx vitest run src/features/library src/pages/library   # em apps/web
```

Esperado: sem erro; sem `TodayCards` nem teste dele; `SourceBar.test.tsx` cobre abrir/fechar (botão, Esc com foco de volta, clique fora), `aria-expanded` e axe aberto e fechado.

## E2E (API e Postgres locais com seed, ver CLAUDE.md)

```sh
npm run test:e2e -w @cruzadinha/web
```

Esperado: `sem-saltos.spec.ts` mede 0 px de deslocamento ao abrir/fechar o painel; os outros specs abrem o jogo pelo dia de hoje na grade; `erros-com-titulo.spec.ts` acha um só `h1`.

## Manual

1. `npm run dev -w @cruzadinha/web` e abrir `/calendario`: sem "Hoje", ícone na ponta direita das abas.
2. Abrir o painel, escolher um mês, informar uma data válida (foco no dia), uma futura (mensagem). Fechar por ícone, Esc (foco no ícone) e clique fora.
3. Repetir em `/x1/novo` (seletor de dia) e em janela de 360 px.

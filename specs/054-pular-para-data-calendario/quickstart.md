# Quickstart: Pular para uma data no calendário

## Pré-requisitos

`npm ci`. Os testes não usam rede nem banco.

## Testes automatizados

```sh
cd apps/web
npx vitest run src/features/library src/pages/library
npm run typecheck && npm run lint
```

Esperado: `jump.test.ts` (datas válidas, 31/02, futura, anterior ao período, limites de mês), `JumpToDate.test.tsx` (select troca o mês, data válida chama o salto, erro com `role="alert"`, axe sem violações) e `LibraryPage.test.tsx` (salto mantém fonte e filtro; foco no dia).

## Verificação manual

1. `npm run dev -w @cruzadinha/web` com a API e o seed rodando; abrir `/calendario`.
2. Escolher no seletor um mês de seis meses atrás: a grade e o título mudam e "Anterior"/"Próximo" seguem dali.
3. Informar uma data válida de três meses atrás: o mês aparece e o foco cai no dia; Enter abre.
4. Informar amanhã, uma data de dois anos atrás e 31/02: o mês não muda e a mensagem aparece sem deslocar a grade.
5. Com o filtro "Concluídas" e outra fonte ativos, saltar: ambos continuam.
6. Recarregar: volta ao mês atual.
7. Largura de 360 px: o campo cabe, sem rolagem horizontal.

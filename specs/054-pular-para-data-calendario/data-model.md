# Data Model: Pular para uma data no calendário

Nada é guardado nem enviado. Só tipos de tela.

## JumpResult (helper `jump.ts`)

```ts
type JumpResult =
  | { ok: true; month: YearMonth; date: string } // date: 'YYYY-MM-DD'
  | { ok: false; reason: 'invalid' | 'future' | 'too-old' }
```

Regras de `resolveJump(input, today)`:

1. `parseIsoDate(input)` nulo (formato ou data impossível, como 31/02) → `invalid`.
2. `input > today` → `future`.
3. mês de `input` antes de `firstNavigableMonth(today)` → `too-old`.
4. senão `ok`, com o mês da data.

Entrada vazia (campo limpo) é ignorada pelo componente, sem chamar `resolveJump`.

## MonthOption

`{ year, month, value: 'YYYY-MM', label: '<mês> de <ano>' }`, do mês atual até `firstNavigableMonth(today)`.

## Estado da página

| Estado | Dono | Guardado |
|---|---|---|
| `month` | `LibraryPage` | não |
| `focusDate: string \| null` | `LibraryPage` | não |

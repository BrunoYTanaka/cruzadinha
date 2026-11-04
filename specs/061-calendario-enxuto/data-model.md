# Data Model: Calendário mais enxuto

Sem entidades nem armazenamento novos. Só estado local de interface:

- `JumpToDate`: `open: boolean` (painel aberto), `error: string` (como hoje, apagado ao fechar o painel não: some ao corrigir a data).
- Mês exibido, `focusDate` e filtro de status continuam em `LibraryPage` e `DayPicker`.

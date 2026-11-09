# Data Model: Design system aplicado ao site

Sem entidade, tabela, schema ou contrato novo (FR-020).

Estado só de interface:

- **Ordenação (fatia 6)**: estado de interface mantido pelo `@dnd-kit` (`DragDropProvider`); o componente guarda só `items: SourceId[]` e `original: SourceId[]` (ordem de antes do arraste, restaurada quando `event.canceled`). A ordem final vai ao mesmo `PUT /api/admin/sources` da feature 060 (vetor com todas as fontes, a ordem do vetor é a ordem salva).

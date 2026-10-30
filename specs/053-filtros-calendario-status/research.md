# Research: Filtros no calendário por status

## Onde guardar o filtro
- **Decision**: `useState` em `LibraryPage`.
- **Rationale**: precisa sobreviver a mês e fonte (ambos estados da mesma página) e sumir ao reabrir (FR-009).
- **Alternatives**: query string (recarregar manteria o filtro, contra FR-009); `localStorage`/configurações (a spec exclui); estado dentro de `Calendar` (a página é dona de mês e fonte, então é mais seguro).

## Apagar ou esconder
- **Decision**: apagar o dia e torná-lo inoperante, mantendo a grade.
- **Rationale**: a grade semanal não desloca; consistente com `none`/`future`.
- **Alternatives**: esconder células (quebra a semana e causa salto de layout).

## Como apagar sem falhar no contraste
- **Decision**: fundo transparente + `--mute` (padrão de `.future`), sem `opacity`.
- **Rationale**: `opacity` reduz o contraste e o axe reprova (mesma lição da feature 050).
- **Alternatives**: `opacity: .4` (reprovaria).

## Semântica dos botões
- **Decision**: grupo de `Pill` com `aria-pressed`.
- **Rationale**: reutiliza `Pill` (visual de "Letra"/"Palavra"), nativo para teclado e leitor de tela; evita tablist, já usada nas fontes.
- **Alternatives**: radiogroup com setas (mais código, sem ganho); `select` (esconde as contagens).

## Dado
- **Decision**: reutilizar `DayState`; nenhuma chamada nova.
- **Rationale**: `buildMonth` já combina biblioteca e progresso do visitante (FR-004, FR-011).

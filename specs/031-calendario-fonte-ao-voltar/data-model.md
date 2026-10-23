# Data Model: Calendário volta na fonte do jogo

Nenhuma tabela, campo da API ou configuração muda.

## Memória da visita

| Item | Tipo | Vida | Quem escreve | Quem lê |
|------|------|------|--------------|---------|
| fonte do último jogo carregado | `PuzzleSourceId \| null` (módulo) | até o calendário montar, ou até recarregar a página | `GamePage` | `useSourceChoice` |

Regras:
- Valor inicial do calendário = fonte lembrada, se válida; senão `loadSourceChoice()` (cruzada padrão).
- Depois de o calendário montar, a memória volta a `null`.
- Não é enviada à conta, não é guardada no aparelho e não aparece em `settingsSchema`.

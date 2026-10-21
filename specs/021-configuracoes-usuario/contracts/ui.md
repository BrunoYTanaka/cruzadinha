# Contrato de interface: engrenagem, modal e efeitos

O mockup está no canvas "Cruzadinha — Configurações" (privado). Ele serve de referência visual; o que vale é este contrato.

## Cabeçalho (`AppLayout`)

- O `ThemeToggle` sai. No lugar dele entra `SettingsButton`:
  - é um `<button>` de 44×44 px com o ícone de engrenagem;
  - `aria-label="Configurações"` e `aria-haspopup="dialog"`;
  - o `Tooltip` mostra "Configurações" no foco e no mouse.
- O botão aparece em todas as telas com cabeçalho, inclusive login e cadastro.

## `Tooltip` (`components/Tooltip.tsx`, genérico)

- Aparece com `:hover` ou `:focus-visible` no alvo. Tem `aria-hidden="true"`, porque o nome acessível já está no alvo.
- Esc fecha o tooltip sem chamar `stopPropagation`, como o balão da feature 018.
- Não muda o layout: posição absoluta, e não é mostrado com toque.
- Usa os tokens de tema, com contraste de 4,5:1 nos dois temas.

## `SettingsDialog` (`features/settings/`)

Usa o `Dialog` existente: foco preso, Esc fecha e o foco volta à engrenagem. Como o `Dialog` não tem botão de fechar próprio, a modal acrescenta no topo um `<button>` de 44 px com ícone X e `aria-label="Fechar"`.

Seções, na ordem:
1. **Tema:** `ThemeButton`.
2. **Ajudas por cruzada:** para letras e para palavras:
   - botões − e + (44 px, com nome "Menos letras" e "Mais letras");
   - o valor atual;
   - uma caixa "Sem limite" que desliga − e +.
3. **Riscar a dica só quando acerta:** um `button role="switch"` com `aria-checked`. A descrição muda conforme o estado.
4. **Cruzada padrão:**
   - até 3 fontes: botões lado a lado (`aria-pressed`, dentro de `role="group"`);
   - mais de 3: `fieldset` com `legend` e `input type="radio"` (FR-012a).
5. **Ir direto ao jogo:** switch. A descrição cita o nome da cruzada padrão.
6. **Rodapé:**
   - logado: "Salvo automaticamente neste aparelho e na sua conta", e um `Notice` de aviso se o envio falhou (FR-023);
   - visitante: "As configurações ficam só neste aparelho", com o link "Entrar" para `/login?next=` (FR-027);
   - botão "Restaurar padrões" em todos os casos.

Regras gerais:
- Não existe botão "Salvar": cada mudança vale na hora (FR-004).
- Até 360 px, a modal ocupa a largura e rola por dentro, sem rolagem lateral da página.
- Com a modal aberta, o relógio do jogo fica pausado e não aparece a capa de pausa.

## `ThemeButton` (`themes/ThemeButton.tsx`)

- **Clique, Enter e Espaço:** levam ao próximo tema na ordem claro → escuro → automático → claro.
- **Ícones:** sol, lua e o círculo meio preenchido para automático. O ícone novo monta com a classe de animação.
- **Nome acessível:** `Tema: <atual>. Mudar para <próximo>`. O `Tooltip` mostra `Mudar para <próximo>`.
- **Anúncio:** uma região `aria-live="polite"` diz "Tema <novo>".
- **Animação de página:** `startThemeTransition(theme, origin)`, descrita em research R10.

## Lista de dicas (`ClueList`, `ClueSheet`)

| Modo | Dica completa e certa | Dica completa e errada | Texto oculto |
| --- | --- | --- | --- |
| `solved` | `.done`: risco, `--ok-tint` e visto | sem marca | ", resolvida" |
| `filled` | `.struck`: só o risco | `.struck`: só o risco | ", preenchida" |

- O `padding-right` que reserva o lugar do visto fica nos dois modos.
- A `ClueBar` e a `WordBar` nunca recebem risco.

## `HelpButtons`

- Com limite numérico: continua `usadas/limite`.
- Sem limite:
  - mostra `N/∞` (por exemplo `1/∞ Letra`);
  - o nome acessível é "Revelar letra: sem limite, N usadas";
  - nunca fica desativado por esgotar.

## Abertura em `/` com "Ir direto ao jogo"

Ver research R14. Quando o atalho não leva ao jogo, a `LibraryPage` mostra um `Notice` informativo que dá para fechar, por exemplo:
- "Cruzada Online: a cruzada de hoje já foi concluída."
- "O Globo não publicou cruzada hoje."
- "Cruzada Online está fora do ar agora."

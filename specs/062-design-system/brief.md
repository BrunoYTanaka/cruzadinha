# Brief: aplicar o design system no site (feature 062)

Entrada para `/speckit-specify`. O contrato visual é `docs/mockups/design-system.html`, nesta pasta: cópia do artefato "Design System Cruzadinha" (https://claude.ai/artifact/2ygwAJhFZKMmwmsZyhaHNc), versão `1793797223-ba76`, sha256 `c6897e05495e6cf4db45e1137d83156df43dcb49688d4ee055d458fb8b8f7de6`. Abra o arquivo no navegador: ele tem a aba Fundamentos, a aba Componentes e a aba Telas (todas as telas do site, em claro e escuro, com seletor de largura).

## Objetivo

Trazer para o site real o estilo desenhado no artefato, que vem da landing e dos tokens do projeto, sem criar valor de cor novo além dos tokens listados abaixo. Só web (`apps/web`); nenhuma mudança de API, de schema ou de contrato.

## Regras que não mudam

- **Landing (`/`)** fica exatamente como está. Não recebe os componentes novos (feature 050).
- **Tabuleiro do jogo** fica como está: células, barra de dica, lista de dicas, teclado na tela, diálogo de conclusão e impressão. O que está ao redor do tabuleiro usa os componentes novos.
- Botões são chapados: sem sombra e sem movimento; mouse e clique usam a camada `--hover-overlay` / `--press-overlay` sobre `background-image`, como o `Button` de hoje.
- Estado nunca só por cor: cor, texto ou símbolo, e borda.
- Os tokens vêm de `light.css` e `dark.css`; `--edge` (contorno) e `--focus` são novos e derivam de `--ink` e `--accent`. Tudo vale nos dois temas.
- Vale o fluxo do `CLAUDE.md`: ciclo completo do Spec Kit em `feat/062-design-system`, Conventional Commits em inglês, sem linha de atribuição de IA, `check:deps`, `lint`, `typecheck` e testes verdes. Cada fatia abaixo é um PR.

## Fatias (uma por PR, nesta ordem)

1. **Tokens** em `shared/themes`: `--edge`, `--focus`, e conferir `--hover-overlay` e `--press-overlay`. Escala de tipografia, raios (6/10/16) e `--tap: 44px` já existem; só alinhar o que faltar.
2. **Componentes de base**: `Button` (4 variantes, `small`, `block`, `pending`), novo `Link` (negrito em repouso, sublinhado amarelo de 3 px que corre da esquerda para a direita no mouse, 280 ms, 5 px no clique, só com `(hover: hover)`, sem animação com movimento reduzido), `Tooltip` único (nome de botão de ícone e aviso de espera, sombra suave), `Notice`, `Dialog` (centralizado, com botão de fechar em ícone no canto superior direito, `--tap`), `Menu`.
3. **Cabeçalho**: Sair vai para dentro de "Sua conta"; logado, o círculo de 38 px com as iniciais do e-mail leva a "Sua conta"; botão de configurações de 44 px; até 560 px os links viram um botão de menu que abre uma folha embaixo.
4. **Calendário**: sem a seção "Hoje" (já feito na 061); abas de fonte numa linha só que rola para o lado no celular (sem barra, última aba cortada como sinal, botão de data fixo à direita); abaixo de 480 px as células mostram só "✓" e "◐" no lugar do texto de estado, mantendo o `aria-label` por extenso, e a legenda leva os mesmos símbolos.
5. **Demais telas**: Sua conta (ícone de sair no botão Sair), Estatísticas, x1 (todas as telas), Administração, erro, espera, status.

## Administração: arrastar para ordenar

Substitui as setas de subir e descer por uma alça de arrastar (seis pontos, 44 px). Precisa de Pointer Events, que o `@dnd-kit` já usa (o drag and drop nativo do HTML não funciona no toque): `touch-action: none` na alça, e o arraste começa só por ela. É obrigatória uma alternativa sem arrastar (WCAG 2.5.7): a alça é focável, Espaço pega, setas movem, Espaço solta, Esc cancela, e o leitor anuncia a posição. `aria-label` curto ("Arrastar O Globo") e as instruções num texto fixo ligado por `aria-describedby`. Linha levantada com contorno escuro e sombra suave; faixa amarela de 4 px no destino. **Decisão (aprovada):** usar `@dnd-kit`; o contrato de comportamento acima vale igual (ver `research.md`, D1).

## Pontos em aberto (resolvidos, ver `research.md`)

- `Notice` ganhou a variante `ok` (`info | ok | warning | error`).
- Os degraus de espaçamento e os pontos de quebra foram conferidos com o código.
- O texto de "Administração" não cita mais os cartões de "Hoje".
- A conferência renderizada tela a tela está em T036 (`research.md`, "Conferência").

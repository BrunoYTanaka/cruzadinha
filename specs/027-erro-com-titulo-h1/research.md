# Research: Telas de erro com título de nível 1

## 1. Onde há (ou não) `h1` hoje

Conferido por leitura do código de `apps/web/src`:

| Tela | Conteúdo da página | `h1` hoje |
|---|---|---|
| `/dia/:date` (6 erros) | só o `ErrorState` | nenhum |
| `/jogo/:id` (404 e falha) | só o `ErrorState` | nenhum (o `h1` do jogo só existe com a cruzada carregada) |
| `RouteError` (3 casos) | só o `ErrorState` | nenhum |
| `LibraryPage`, 401 da API antiga | só o `ErrorState` | nenhum |
| `LibraryPage`, falha do calendário | `h1` "Hoje" (`TodayCards`) + abas + erro | sim, "Hoje" |
| `ServerWake` (hydrate fallback e `RouteError`) | só a mensagem de espera | nenhum (título é `h2`) |
| `NotFoundPage` | título próprio | sim, `h1` |
| `LoginPage`, `RegisterPage`, `StatusPage` | | sim |

A biblioteca não tinha `h1` no grep por `<h1` em `LibraryPage.tsx` porque o `h1` "Hoje" vem de `TodayCards.tsx`. Resolve a dúvida anotada na spec.

## 2. Decisão: nível como prop obrigatória do `ErrorState`

- **Decision**: `ErrorState` ganha `level: 1 | 2` (obrigatória) e renderiza `<h1>` ou `<h2>`; o CSS (`.title`, 20 px, margem 0) é o mesmo.
- **Rationale**: o componente não sabe se é a página inteira ou parte de uma; quem o usa sabe. Obrigatória força a decisão em cada uso novo (FR-004) e o TypeScript a cobra. O estilo já define tamanho e margem do título, então trocar a tag não muda a aparência (FR-005); o peso em negrito é o mesmo no `h1` e no `h2` do navegador.
- **Alternatives considered**:
  - `h1` por padrão e `level={2}` onde couber: menos edições, mas um uso novo dentro de uma página com `h1` nasceria errado sem aviso.
  - `h1` oculto só para leitor de tela: duplica o texto e esconde o título que já está na tela; rejeitado.
  - Inferir o nível pelo contexto (provedor React): complexidade sem ganho para 2 níveis.

## 3. Decisão: "Acordando o servidor" vira `h1`

- **Decision**: `ServerWake` troca o `h2` por `h1` (mesmo `styles.title`, mesmo `id`, mesmo foco).
- **Rationale**: é a página inteira durante a espera, nas duas entradas (`hydrateFallbackElement` e `RouteError`); nada mais é `h1` ali. O foco movido para o título (`titleRef`) não depende do nível.
- **Alternatives considered**: deixar `h2` (o axe só pegaria se ela entrasse numa varredura; a falha é a mesma da issue).

## 4. Decisão: erro do calendário da biblioteca fica `h2`

- **Decision**: `level={2}` no `ErrorState` de `calendarArea`.
- **Rationale**: a página já tem o `h1` "Hoje"; o `Calendar` usa `h2` para o próprio título, então o erro ocupa o lugar dele no mesmo nível, sem pular nível (FR-003).
- **Alternatives considered**: `h3` (pularia nada, mas ficaria abaixo do que o calendário ocupa); rejeitado por incoerência com o `h2` do calendário.

## 5. Testes

- **Unitário**: `ErrorState.test.tsx` ganha casos para `level` 1 e 2 (nível do título, `role="alert"` mantido). `DayRoute.test.tsx`, `LibraryPage.test.tsx`, `ServerWake.test.tsx` e testes da `GamePage`/`RouteError` que já provocam cada erro passam a afirmar `getAllByRole('heading', { level: 1 })` com um item (e, na biblioteca, o `h1` "Hoje" sozinho). Primeiro vermelhos, depois verdes (regressão antes da correção).
- **E2E**: `botoes.spec.ts` perde `expectNoAxeViolations(page, ['page-has-heading-one'])` e o comentário (passa a chamar sem exclusão). Novo `erros-com-titulo.spec.ts` percorre as situações simuladas com `page.route` (502, 404, 429, offline do dia; 404 e 502 da cruzada; erro de rota; falha da biblioteca), conta `h1` e roda axe, nos dois temas. O erro de rota e o "Acordando o servidor" saem de pedidos atrasados ou falhos como em `espera-servidor.spec.ts`.
- **Aparência (SC-004)**: o mesmo e2e compara `font-size`, `font-weight`, `margin` e a caixa do título; os valores de antes são medidos na T001 e anotados na seção 7 deste arquivo; o e2e compara os valores de depois com eles (tolerância de 1 px).

## 6. Sem pendências

Nenhum `NEEDS CLARIFICATION`.

## 7. Medições e consulta de documentação (preenchida na implementação)

- Aparência antes da mudança (T001): o estilo do título vem só da classe `.title` de `ErrorState.module.css` (`font-size: 20px`, `margin: 0`; peso e cor herdados, iguais em `h1` e `h2`). Em vez de guardar números de antes, o e2e (`erros-com-titulo.spec.ts`, último teste) troca o `h1` por um `h2` de mesma classe no mesmo lugar e compara tamanho, peso, cor, margem e caixa (tolerância de 1 px) nos dois temas: passou.
- Consulta ao Context7 (T002), `/microsoft/playwright` e `/dequelabs/axe-core-npm`: `route.fulfill({ status, headers, contentType, body })`, `route.abort('internetdisconnected')`, `page.emulateMedia({ colorScheme })`, `AxeBuilder#exclude` e `#disableRules`/`withRules` existem como usados; nada a mudar.
- Achado fora do escopo: com o calendário da biblioteca em erro, o axe acusa `aria-valid-attr-value` (as abas de fonte têm `aria-controls="source-panel"`, mas o painel só existe com o calendário carregado; feature 015). O teste dessa tela confere só as regras de título (`page-has-heading-one`, `heading-order`, `empty-heading`). Vale uma issue à parte.

# Research: Administração em abas

Nada ficou como NEEDS CLARIFICATION no Technical Context. As decisões abaixo saem do código atual, do mockup e das respostas em Clarifications.

## R1. Componente de abas compartilhado

- **Decision**: `shared/components/Tabs/Tabs.tsx` com só a `tablist`: `Tabs<T extends string>({ label, tabs: { id: T; name: string; caption?: ReactNode }[], value, onChange, tabId: (id) => string, panelId: (id) => string })`. O CSS sai de `SourceTabs.module.css` para `Tabs.module.css` (classe `count` vira `caption`). `SourceTabs` vira um invólucro que passa `caption={completedLabel(count)}`, `tabId = source-tab-<id>` e `panelId = () => 'source-panel'`, então os ids, o `Calendar` e os testes do calendário não mudam. O teclado (setas com volta, Home, End, foco na escolhida, só ela com `tabIndex=0`) é o de hoje, movido sem alteração. Única adição: ao montar, a aba escolhida rola para a vista (`scrollIntoView` com `nearest`), para `?aba=` de uma aba fora da tela; no calendário isso só age quando a fonte escolhida está fora da linha visível, então a aparência inicial não muda (SC-007).
- **Rationale**: `check:deps` proíbe `admin → features/library`; o issue pede extrair. Painel fica de fora porque o calendário usa um painel único (`source-panel`) e o admin um por aba.
- **Alternatives considered**: copiar `SourceTabs` dentro do admin (duplicaria teclado e estilo; o issue pede um componente só); `Tabs` com painéis embutidos (não serve ao calendário).

## R2. Aba na URL

- **Decision**: hook `features/admin/hooks/useAdminTab` com `useSearchParams`. A função pura `resolveAdminTab(param, generatedIds)` devolve `'fontes'` quando o valor falta ou não está em `['fontes', ...generatedIds]`. Trocar de aba chama `setSearchParams(prev => { prev.set('aba', id); return prev }, { replace: true })`. Um valor desconhecido não reescreve a URL (só a tela abre em "Fontes").
- **Rationale**: React Router 7 (Context7): `setSearchParams` navega e aceita as opções de navegação; `replace` evita uma entrada de histórico por troca (spec, Assumptions). Testar a regra pura evita depender do roteador nos casos de borda.
- **Alternatives considered**: `useState` sem URL (perde FR-006); `navigate('?aba=…')` (mesmo efeito, mais código).

## R3. Rascunho preservado entre abas

- **Decision**: `AdminTabs` renderiza todos os painéis; o inativo recebe o atributo `hidden`. O rascunho continua no estado local que já existe (`draft` em `SourcesAdmin`; tamanho e dificuldade no painel de cada fonte gerada).
- **Rationale**: FR-007 e o issue pedem painéis montados; desmontar perderia o `useState`. Painéis `hidden` saem da árvore de acessibilidade, então nomes repetidos ("Salvar", "Descartar alterações") não colidem entre painéis e o `aria-label="Salvar Casa"` de hoje deixa de ser necessário.
- **Alternatives considered**: subir os rascunhos para `AdminTabs` ou para a URL (mais código, sem ganho).

## R4. Carregamento e erro da lista de fontes geradas

- **Decision**: `AdminTabs` usa `useGeneratedSources()`. Enquanto a lista carrega, a área das abas mostra `LoadingState` (nível 2); assim `?aba=casa` não pisca em "Fontes". Se falhar, as abas mostram só "Fontes" e um `ErrorState` (nível 2, "Não foi possível carregar as fontes geradas agora.", com tentar de novo) fica logo abaixo do painel.
- **Rationale**: as duas consultas são da administração e rápidas; a regra da URL precisa da lista para saber se `casa` existe. O `ErrorState` com retry já é o usado hoje.
- **Alternatives considered**: mostrar "Fontes" já e acrescentar as abas depois (o `?aba=casa` trocaria de aba sozinho ao terminar).

## R5. Aba Fontes

- **Decision**: botões com texto ("Salvar" primário; "Descartar alterações" secundário, só com alterações), via `Button`. O estado vira um selo local (`✓ Visível` com tom ok, `Escondida` neutro), texto visível dentro do `label` da caixa, com o `✓` em `aria-hidden`; sai o `VisuallyHidden` duplicado. O texto inicial é o do mockup, sem "cartões de Hoje". A área de altura fixa do aviso continua (o mockup a mantém, `min-height: 64px`). Arrasto, teclado e anúncios não mudam.
- **Rationale**: mockup `adm(...)`; FR-009 a FR-012.

## R6. Aba de fonte gerada

- **Decision**: `GeneratedSourcesAdmin` passa a exportar o painel de uma fonte (`GeneratedSourcePanel`, `view` por prop); `AdminTabs` monta um por fonte.
  - Contador local (como em `SettingsDialog`): `role="group"` rotulado por "Tamanho da grade", botões `−`/`+` com `aria-label` "Diminuir a grade"/"Aumentar a grade", desligados em `GENERATED_GRID_SIZE_MIN`/`MAX`, `<output aria-live="polite">N × N</output>`. O tamanho vira número (sai o campo livre e a validação `validSize`).
  - Dificuldade: `fieldset` com rádios e `difficultyLabels` (Fácil, Médio, Difícil).
  - Dois resultados separados: `saveResult` (ao lado dos botões, numa linha `flex-wrap` com o aviso em `flex: 1; min-width: 220px`) e `discardResult` (no fim da seção "Cruzada de hoje"). Nenhum dos dois reserva altura.
  - "Cruzada de hoje": `dl` de cartões (Grade `size × size`, Dificuldade, Palavras, Chamadas restantes `n de 3`); sem cruzada, só o cartão de chamadas e "Sem cruzada hoje.". Tabelas `caption` Horizontais/Verticais com `th scope="col"` Nº, Resposta, Dica.
  - Zona de perigo: bloco com `h3` "Descartar a cruzada de hoje" (níveis em R9); texto conforme `callsLeft`; selo de alerta com `BLOCKED_TEXT` quando `blockedBy`; "Descartar" secundário desligado se `!discardable`. Confirmação no `Dialog` atual, sem mudança.
  - Descarte com chamadas: aviso info "Cruzada descartada. A próxima coleta gera outra. Para gerar agora:" e, abaixo, `input readonly` (rótulo "Comando para gerar agora", valor `gh workflow run collect.yml`) com `Button` "Copiar" (`navigator.clipboard.writeText`, como em `ShareLinkPanel`; resultado num `role="status"`: "Comando copiado." ou "Não foi possível copiar. Selecione o comando."). Sem chamadas: só "Cruzada descartada. As chamadas de hoje acabaram: o dia ficará sem cruzada.".
- **Rationale**: mockup `gen(...)`; FR-013 a FR-022; padrões já existentes no site, em CSS local (admin só importa `session`).
- **Alternatives considered**: promover Contador/Copiar a `shared/components` (escopo além do pedido; nenhum terceiro uso hoje).

## R7. Dificuldade da cruzada de hoje (Clarifications)

- **Decision**: em `shared`, `difficultyTitle(d)` (`Dificuldade: ${difficultyLabels[d]}`) e `parseDifficultyTitle(title): Difficulty | null` ficam ao lado de `difficultyLabels`; `layout.ts` passa a usar `difficultyTitle`. `generatedView` devolve `today.difficulty = parseDifficultyTitle(stored.puzzle.attribution.title)`. No schema, `difficulty: difficultySchema.nullable().optional()`. O site mostra `difficultyLabels[d]` ou "—".
- **Rationale**: a dificuldade não é coluna; só existe no título que a própria geração grava. Montar e ler no mesmo arquivo garante o par (teste de ida e volta). Opcional e anulável mantém site novo + API velha e linhas antigas funcionando.
- **Alternatives considered**: coluna nova (migração sem necessidade); site ler `GET /api/puzzles/:id` e o título (pedido extra, regra no lugar errado); tirar o cartão (o usuário escolheu manter).

## R8. Rótulo "Médio"

- **Decision**: o admin usa `difficultyLabels` sem mudança; um commit depois do primeiro troca "Média" por "Médio" no mockup.
- **Rationale**: resposta em Clarifications; o jogador já vê "Dificuldade: Médio".

## R9. Títulos e layout da página

- **Decision**: `h1` "Administração" (único); cada painel `role="tabpanel"`, `aria-labelledby` da aba, com `h2` (nome da seção ou da fonte); seções "Configuração", "Cruzada de hoje" e a zona de perigo em `h3` (o mockup usa `h3` nas três); tabelas com `caption`. Página com `max-width: 688px` (mockup), `grid-template-columns: minmax(0, 1fr)` para a linha de abas rolar sem rolar a página.
- **Rationale**: um `h1` por página (CLAUDE.md); regra de grade com linha rolável (062).

## R10. Celular

- **Decision**: as abas rolam como as de fonte (o CSS vem junto em `Tabs`, inclusive o `@media (max-width: 599px)`). O aviso de salvar quebra para baixo e desloca a seção seguinte (decidido na spec). As tabelas ficam uma sobre a outra (`repeat(auto-fit, minmax(260px, 1fr))`).

## R11. Compatibilidade e versões

- **Decision**: commits `feat(web)`, `feat(api)` e mudança em `packages/shared` (patch nos dois). Nenhuma remoção; o campo novo é opcional nos dois sentidos.
- **Rationale**: `docs/versionamento.md` (duas versões para remover algo; aqui nada é removido).

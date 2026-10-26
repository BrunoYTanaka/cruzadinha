# Research: Ajudas zeradas ao jogar de novo

## 1. O que já foi verificado

**Decision**: tratar a causa como desconhecida; o código lido não tem o defeito descrito.

**Rationale**:
- `game-logic/reducer.ts` (`case 'reset'`): zera `usage`, `marks`, `locked` e `lastHelp`.
- `useGame.playAgain` (conta): `resetProgress` no servidor, depois `clearHelp(userId, puzzleId)`, limpa a fila de envio, reinicia `savedCells`/`savedHelp` e despacha `reset`.
- `useGame.playAgain` (visitante): `guestStore.reset` aplica `decideGuestReset`, que grava `help: null`.
- O efeito que grava as ajudas da conta (`[usage, marks, locked]`) só grava quando `hasHelp`, então um estado zerado não regrava nada.
- `GamePage` busca o progresso de novo ao abrir (`gcTime: 0`), sem cache velho.
- O contador exibido (`HelpButtons`) lê `state.usage` e os limites dos ajustes.
- Testes novos em `PlayAgainHelps.test.tsx` (visitante e conta, na sessão e depois de reabrir; visitante que reabre uma concluída com ajuda guardada): todos passam.

**Alternatives considered**: assumir a hipótese do relato (reinício não limpa `localStorage`). Descartada: `clearHelp` já existe e funciona no teste.

## 2. Hipóteses que o jsdom não cobre

- **Duas abas ou janelas**: a outra aba mantém o estado em memória e regrava as ajudas antigas (efeito de ajuda ou `storage`) depois do reinício. O visitante grava no IndexedDB com `savedAt` mais novo, então a aba velha pode vencer.
- **Gravação pendente no navegador real**: o debounce da fila de salvamento do visitante com relógio real pode disparar depois do `reset` com o instantâneo antigo (`help` incluído) e `savedAt` posterior.
- **Versão antiga do site**: o relato não informa a versão; o defeito pode já ter sido corrigido por mudanças de ajuda/reinício posteriores à versão vista.
- **Ajuda esgotada ou limite alterado**: usos acima do limite novo (FR-009 da spec 021) sem reinício claro do contador.

**Decision**: o passo 1 do plano reproduz essas variantes em Playwright, na ordem acima, antes de mexer em código.

## 3. Sem mudança de API, banco ou ajustes

**Decision**: a correção fica em `apps/web`.

**Rationale**: as ajudas nunca vão ao servidor (a conta as guarda só no aparelho; o corpo do `PUT /api/progress` é estrito). Isso mantém a regra de compatibilidade entre versões do site e da API e dispensa DDE/ERD.

## 4. Context7 (T003)

- Playwright (`/microsoft/playwright`, project uses `@playwright/test` ^1.64.1): `context.newPage()` opens a second page in the same browser context (shares `localStorage`, IndexedDB and cookies); `page.reload()` waits for `load`. Used by the new e2e spec.
- Vitest (`/vitest-dev/vitest/v5.0.3`): `fakeTimers.shouldAdvanceTime` advances mocked time with the real clock, which is what `installGameTestLifecycle` already relies on. No new fake-timer pattern was needed.

## 5. Reproduction (T004 to T006), 2026-10-26

Run in Chromium against `vite preview`, local Postgres with the seed, API from this branch (`apps/web/e2e/jogar-de-novo-ajudas.spec.ts`):

| Case | Result |
|------|--------|
| Visitor, one tab: use letter and word help, finish, "Ver o tabuleiro", "Jogar de novo", reload | Counters back to the limit, no help marks. **Passes.** |
| Account, same steps | **Passes.** |
| Account, second tab opened with the help already used, first tab plays again, second tab types a letter, reload | **Passes** (an account saves its help only when the help usage changes). |
| Visitor, same two-tab steps | **Fails.** After the old tab types a letter and the page is reloaded, the old help (and the old cells) are back. |

Cause of the failing case: the visitor store keeps the newest save per puzzle (`decideGuestSave`: "o salvamento mais recente prevalece entre abas", feature 013). The old tab still holds the previous game in memory and its next save, with a newer `savedAt`, overwrites the reset record, so cells and help return together. The board is not cleaned and the help kept, so this is not the symptom in issue #86 (board empty, helps kept); it is the documented last-write-wins rule.

Not run: the "Sem limite" and lowered-limit variants (the reducer `reset` zeroes `usage` regardless of the limit, and no unit test showed otherwise).

Conclusion: the single-tab defect from the issue does not reproduce for visitor or account. The two-tab visitor behaviour is a documented rule, and changing it needs a decision (spec update first, per the constitution).

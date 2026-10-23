# Research: Calendário volta na fonte do jogo

## 1. Como levar a fonte de volta ao calendário

**Decision**: memória da visita num módulo (`source-choice.ts`): `GamePage` grava a fonte da cruzada carregada; `useSourceChoice` a usa como valor inicial (senão, a cruzada padrão) e `LibraryPage` a apaga depois de montar (efeito).

**Rationale**:
- Cobre todos os caminhos de volta (cada `Link to="/"`, o cabeçalho, o botão do navegador, o diálogo de conclusão) sem tocar em nenhum link: todos desmontam o jogo e montam o calendário.
- O botão "Voltar" remonta o calendário; com estado só no componente (hoje) a aba se perderia, com a memória do módulo não.
- Recarregar ou abrir uma aba nova zera o módulo, o que dá FR-004 sem código.
- Apagar após a montagem faz o calendário aberto de outra página (login → cabeçalho) valer a cruzada padrão (história 2, cenário 3), e a troca de aba não vira memória (FR-005).
- Sem mudar endereços (FR-007), sem gravar no aparelho nem na conta (SC-004).

**Alternatives considered**:
- `?fonte=` nos links de volta e no calendário: não cobre o botão "Voltar" a menos que cada troca de aba reescreva a URL, e recarregar `/?fonte=x` manteria a aba, contra FR-004. Também muda endereços (FR-007) e exige mexer em 5 links.
- `state` de navegação nos `Link`: não vale para o botão do navegador nem para o link do cabeçalho.
- `sessionStorage`: sobrevive à recarga (contra FR-004) e precisa de try/catch para modo privado.
- Voltar a lembrar a aba em `localStorage`/configurações: é o que a feature 021 removeu de propósito (FR-004, SC-002).

## 2. Onde anotar a fonte

**Decision**: no `GamePage`, num efeito quando a resposta da cruzada chega, com `puzzleSourceIdSchema.safeParse(puzzle.source)`; fonte inválida não anota.

**Rationale**: o jogo é a única tela que sabe a fonte de qualquer caminho de entrada (cartão "Hoje", `/dia/...`, atalho "Ir direto ao jogo"), cobrindo FR-003. `DayRoute` acaba em `/jogo/:id` e não precisa de mudança.

## 3. Cuidados

- `React.StrictMode` roda inicializadores e efeitos duas vezes: ler no inicializador (puro) e apagar no efeito dá o mesmo resultado nas duas passagens.
- Ao voltar com a fonte fora do ar ou sem cruzadas, a aba mostra o aviso que já existe (borda do spec); nada novo.
- Dois jogos seguidos (diálogo "próxima fonte"): vale o último carregado.

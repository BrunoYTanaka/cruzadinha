# Contrato de interface: escolha da fonte no site

## Calendário (`/`)

- O `SourcePicker` fica acima do calendário, abaixo do topo ("Escolha um dia" e "Jogar a de hoje"):
  - `role="group"` com `aria-label="Fonte da cruzada"`.
  - Dois `Button`, "O Globo" e "Cruzada Online", com `aria-pressed` no ativo.
  - Alvo de toque mínimo do projeto e só tokens de tema, nos modos claro e escuro.
  - Funciona com Tab, Enter e Espaço (botões nativos).
- Valor inicial: `cruzadinha:source`, ou `oglobo` quando não houver valor válido.
- Ao trocar de fonte:
  - A escolha é gravada e a biblioteca da fonte é buscada (`['library', viewer, source]`).
  - O mês visível não muda.
  - Enquanto carrega, aparece o `LoadingState` da biblioteca, sem perder o seletor.
- Os dias do calendário mostram a situação e o tempo do puzzle da fonte escolhida.
- Para o visitante, a situação vem do IndexedDB pelo `puzzleId` (`mergeGuestLibrary`, sem mudança).
- "Jogar a de hoje": `/jogo/<puzzleId>` se a fonte escolhida já tem o puzzle de hoje; senão, `/dia/<hoje>?fonte=<source>`.
- Um dia buscável leva a `/dia/<data>?fonte=<source>`.
- O aviso "Novas cruzadas não podem ser buscadas agora…" só aparece para a fonte escolhida (`cruzadinha:source-down:<source>`).
- Subtítulo: "Uma cruzada por dia de cada fonte.".

## Dia (`/dia/:date?fonte=<source>`)

- `fonte` válido: vale ele, e ele vira a preferência gravada. Sem `fonte` ou com valor inválido: vale a preferência.
- Busca `GET /api/puzzles?level=daily&date=<date>&source=<source>`. As telas de 404, 502, 429, sem conexão e futuro ficam iguais, e as marcas de 404 e 502 passam a ser por fonte.
- Se a resposta trouxer `puzzle.source` diferente da fonte pedida (API anterior):
  - Aparece o `ErrorState` "Esta fonte não está disponível agora" com "Voltar à biblioteca".
  - Não navega para o jogo e não guarda nada no cache do puzzle.

## Jogo (`/jogo/:puzzleId`)

A atribuição continua `Fonte: <sourceName>` seguida de título, autor e direitos, mas `attribution()` em `GamePage.tsx` deixa de repetir uma parte igual a outra já mostrada. Para `cruzadaonline` sem metadados, a linha é "Fonte: Cruzada Online" (nome e direitos iguais). Para o O Globo, nada muda. A comparação de letras usa `plainLetter` (`game-logic/letters.ts`): `Ã` e `É` viram `A` e `E`, e o `Ç` continua `Ç`, uma letra própria que o teclado na tela já tem.

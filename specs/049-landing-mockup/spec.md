# Feature Specification: Landing page alinhada ao mockup

**Feature Branch**: `feat/049-landing-mockup`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "Alinhar a landing page pública (`/`, feature 048) ao mockup aprovado em https://claude.ai/artifact/5SdYtHc7FbzT2JibcmHLc4, por inteiro." A landing entregue pela feature 048 tem as mesmas seções do mockup, mas um visual contido (títulos pequenos, cartões simples, botão padrão do site) que não segue o desenho aprovado.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Primeira impressão de "página de cruzada" (Priority: P1)

Quem chega a `/` vê o desenho do mockup: o nome CRUZADINHA em dez casas grandes que ocupam a largura do topo, numeradas como numa cruzada (1, 2 e 3 nas casas 1, 5 e 7), caindo uma a uma com um clarão amarelo; logo abaixo do título, a frase "Palavras cruzadas *todo dia*, sem cadastro e sem pressa." (com "todo dia" grifado em amarelo) de um lado e, do outro, um texto de apoio e dois botões. Atrás, uma grade quadriculada que some para baixo e três letras soltas (Ç, A, É) que flutuam.

**Why this priority**: É a diferença mais visível entre a landing no ar e o mockup, e a razão de a página existir (apresentar o site em poucos segundos).

**Independent Test**: Abrir `/` em tela larga e em 360 px, com e sem movimento reduzido, e comparar o topo com o mockup: título em casas numeradas, frase de destaque, dois botões, grade e letras soltas.

**Acceptance Scenarios**:

1. **Given** uma tela larga, **When** `/` abre, **Then** o título aparece em dez casas com borda de 2 px, ocupando a largura do topo até 820 px, com os números 1, 2 e 3 nas casas 1, 5 e 7, e, abaixo dele, a frase de destaque fica de um lado e o texto de apoio com os botões do outro (duas colunas quando cabem, uma coluna quando não cabem).
2. **Given** movimento permitido, **When** `/` abre, **Then** as casas caem em sequência, cada uma com um clarão amarelo que se desfaz, e as três letras flutuam devagar atrás do conteúdo.
3. **Given** movimento reduzido, **When** `/` abre, **Then** o título, a grade e as letras aparecem prontos e parados.
4. **Given** a landing aberta, **When** a pessoa aciona "Jogar a cruzada de hoje", **Then** chega ao jogo da fonte padrão do dia (como na 048); **When** aciona "Experimentar aqui", **Then** a página rola até a mini cruzada.
5. **Given** a landing, **When** o conteúdo é lido por leitor de tela ou buscador, **Then** continua havendo um único título principal, com o texto "Cruzadinha" e a frase de destaque acessíveis, e as casas do título são só decoração.

---

### User Story 2 - Seção "Como funciona" com a identidade do mockup (Priority: P1)

Abaixo do topo, a seção "Como funciona" abre com um rótulo curto, o título "Abriu, jogou. O resto é opcional." e três cartões com ícone de cruzada (1↓, 2→, 3↓) e borda de 2 px: jogar sem conta, uma cruzada por dia de várias fontes e funcionar sem internet. Em telas largas o cartão do meio fica deslocado para baixo. Logo depois, pílulas com os recursos menores: modo lápis, atalhos de teclado, tema claro e escuro, tabuleiro que se ajusta à tela e cronômetro que pausa sozinho.

**Why this priority**: Explica o valor do site e completa a primeira dobra de rolagem; com o topo é o que dá a cara do mockup.

**Independent Test**: Rolar até "Como funciona" e conferir rótulo, título, três cartões com ícone, deslocamento do cartão do meio em tela larga e as cinco pílulas.

**Acceptance Scenarios**:

1. **Given** uma tela larga, **When** a seção aparece, **Then** os três cartões ficam lado a lado com o do meio deslocado; **Given** 360 px, **Then** ficam em coluna, sem deslocamento e sem rolagem horizontal.
2. **Given** a seção, **When** lida, **Then** o título do segundo cartão traz a quantidade de fontes calculada a partir da lista de fontes do jogo, nunca fixa.
3. **Given** as pílulas, **When** lidas, **Then** são as cinco do mockup, com o texto "tecle ?" no atalho de teclado, e fazem parte do texto entregue à página.

---

### User Story 3 - "Experimente" como no mockup (Priority: P2)

A seção da mini cruzada tem rótulo "Experimente", título "Uma mini cruzada, bem aqui." e uma caixa com sombra deslocada contendo a grade 5x5 e, ao lado (ou abaixo em tela estreita), as dicas em duas listas, Horizontais e Verticais. A dica da palavra em uso fica destacada; uma palavra resolvida tem a dica riscada com ✓ e as casas ganham cor de acerto com um pequeno salto; ao resolver tudo aparece a mensagem de vitória, e o botão "Limpar" volta ao estado inicial. A grade, as respostas e as dicas são as do mockup (COSTA, MUNDO, OCASO, CAMPO, SONDA, ATOMO).

**Why this priority**: Mostra o jogo, mas a landing já cumpre o papel sem ela; hoje a mini cruzada existe com outro visual e outra amostra.

**Independent Test**: Resolver a mini cruzada por inteiro com mouse, teclado físico e teclado do celular e conferir destaque da palavra, dica riscada com ✓, contagem de acertos, mensagem final e "Limpar".

**Acceptance Scenarios**:

1. **Given** a mini cruzada, **When** a pessoa seleciona uma casa e digita, **Then** a letra entra, a seleção avança e a palavra e a dica atuais ficam destacadas; clicar de novo na mesma casa troca a direção.
2. **Given** uma palavra completa e igual à resposta (comparada sem acento), **When** a última letra é digitada, **Then** a dica fica riscada com ✓ e as casas mudam de cor; a contagem "N de 6 palavras certas." acompanha.
3. **Given** as seis palavras certas, **When** a última é completada, **Then** a mensagem de conclusão aparece destacada, com o convite a jogar a cruzada de hoje.
4. **Given** a mini cruzada em uso, **When** a pessoa joga ou aciona "Limpar", **Then** nenhuma chamada vai ao servidor e nada é salvo na conta nem no progresso de visitante.
5. **Given** setas, Backspace e clique numa dica, **When** usados, **Then** movem a seleção como no jogo e no mockup; Tab e Shift+Tab passam para a próxima e para a anterior palavra e, na última (Tab) ou na primeira (Shift+Tab), deixam a grade, para o teclado nunca ficar preso nela.

---

### User Story 4 - Fontes, faixa final e tipografia do mockup (Priority: P2)

A seção das fontes passa a ter rótulo "Fontes", título "N fontes, um só lugar." (N calculado) e uma linha por fonte, com nome em destaque, descrição ao lado e realce ao passar o mouse. A chamada final vira uma faixa escura de largura total, "A cruzada de hoje já está esperando.", com o botão "Jogar agora" e o link para o calendário. Em toda a landing, títulos usam Fraunces, rótulos usam Roboto Mono e o texto usa Roboto, nos temas claro e escuro do mockup.

**Why this priority**: Fecha a página no mesmo desenho, mas depende pouco do resto.

**Independent Test**: Conferir a seção das fontes contra a lista de fontes do jogo, a faixa final nos dois temas e as famílias de letra aplicadas.

**Acceptance Scenarios**:

1. **Given** as fontes do jogo, **When** a landing abre, **Then** há exatamente uma linha por fonte, na ordem do jogo, e uma fonte nova sem texto continua falhando a verificação de tipos (regra da 048 mantida).
2. **Given** a faixa final, **When** vista em qualquer largura, **Then** ocupa toda a largura da janela, sem criar rolagem horizontal.
3. **Given** os temas claro e escuro, **When** a landing é verificada com a ferramenta de acessibilidade, **Then** não há violações de contraste, nome acessível ou foco.

---

### User Story 5 - Botões e estilo restritos à landing (Priority: P3)

O botão principal da landing é amarelo, com borda e sombra deslocada que "afunda" ao pressionar; o botão quieto tem só borda. Esse estilo, as cores e as bordas de 2 px valem apenas dentro da landing; o restante do site (calendário, jogo, conta, login) fica exatamente como está.

**Why this priority**: Evita que a mudança vaze para o resto do site, mas só importa depois de o resto existir.

**Independent Test**: Comparar capturas das demais páginas antes e depois e conferir que a landing é a única mudada; percorrer a landing só com o teclado e ver o foco.

**Acceptance Scenarios**:

1. **Given** as demais páginas, **When** abertas depois da mudança, **Then** os botões, cores e tipografia são os mesmos de antes.
2. **Given** um botão da landing, **When** a pessoa passa o mouse, pressiona ou foca com o teclado, **Then** há reação visível (deslocamento, afundar, anel de foco).

---

### Edge Cases

- Movimento reduzido: nada anima (queda das casas, clarão, letras flutuantes, saltos, entrada ao rolar); o estado final fica legível e parado.
- Navegador sem suporte à animação ligada à rolagem: o conteúdo aparece pronto, sem a entrada animada.
- 360 px: sem rolagem horizontal; os dez quadros do título cabem; as letras flutuantes somem; cartões e fontes em coluna.
- JavaScript desativado ou lento: texto da landing legível (HTML pré-gerado da 048); a mini cruzada e as animações só funcionam com JavaScript.
- Fonte de letra que demora a carregar: nenhum elemento muda de lugar depois de aparecer.
- Fonte do jogo adicionada ou removida: a contagem nos títulos e as linhas de fontes acompanham sozinhas.
- "Ir direto ao jogo" ligado: o comportamento da 048 não muda (nenhum quadro da landing aparece antes da decisão).
- Sem conexão: a landing abre da cópia do aplicativo instalado; a mini cruzada funciona.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O topo MUST mostrar o título CRUZADINHA em dez casas com borda de 2 px, ocupando a largura disponível até 820 px, com os números 1, 2 e 3 nas casas 1, 5 e 7; a frase "Palavras cruzadas todo dia, sem cadastro e sem pressa." (com "todo dia" grifado em amarelo), o texto de apoio e os botões "Jogar a cruzada de hoje" e "Experimentar aqui" ficam ao lado do título quando há espaço e abaixo dele quando não há.
- **FR-002**: A página MUST continuar com um único título principal. O texto "Cruzadinha" e a frase de destaque MUST estar acessíveis e presentes na página entregue; as casas do título MUST ser decoração para leitor de tela.
- **FR-003**: Com movimento permitido, as casas MUST cair em sequência com um clarão amarelo que se desfaz, e três letras soltas (Ç, A, É) MUST flutuar atrás do conteúdo; com movimento reduzido tudo MUST aparecer pronto e parado.
- **FR-004**: O topo MUST ter, atrás do conteúdo, uma grade quadriculada que se apaga para baixo; a grade e as letras soltas MUST ser decoração, ocultas das tecnologias assistivas e sem receber foco.
- **FR-005**: O botão principal da landing MUST ser amarelo, com borda e sombra deslocada que sobe ao passar o mouse e afunda ao pressionar; o botão quieto MUST ter só borda. Ambos MUST ter foco visível e área de toque suficiente. Isso substitui o uso do botão padrão do site dentro da landing (FR-005 da 048), sem alterar o botão padrão nas outras páginas.
- **FR-006**: A seção "Como funciona" MUST ter rótulo, o título "Abriu, jogou. O resto é opcional.", três cartões com ícone (1↓, 2→, 3↓) e borda de 2 px, e MUST deslocar o cartão do meio em telas largas; os textos dos cartões são os do mockup, e a quantidade de fontes no segundo cartão MUST vir da lista de fontes do jogo.
- **FR-007**: Logo abaixo dos cartões MUST haver cinco pílulas de recursos: modo lápis para rascunhar, atalhos de teclado (tecle ?), tema claro e escuro, tabuleiro que se ajusta à tela e cronômetro que pausa sozinho.
- **FR-008**: A seção "Experimente" MUST ter rótulo, o título "Uma mini cruzada, bem aqui.", uma caixa com sombra deslocada com a grade 5x5, a contagem de palavras certas, o botão "Limpar" e duas listas de dicas (Horizontais e Verticais). A amostra MUST ser a do mockup: respostas COSTA, MUNDO, OCASO (horizontais) e CAMPO, SONDA, ATOMO (verticais), com as dicas do mockup, e a grade inicial MUST vir com as três primeiras letras da primeira palavra preenchidas.
- **FR-009**: Na mini cruzada, a palavra e a dica em uso MUST ficar destacadas; uma palavra resolvida (completa e igual à resposta, comparada sem acento) MUST ter a dica riscada com ✓ e as casas com cor de acerto; clicar numa dica MUST levar à palavra; ao resolver as seis MUST aparecer a mensagem de conclusão com o convite a jogar. Mouse, teclado físico, teclado do celular, setas, Backspace e clique nas dicas MUST funcionar; Tab e Shift+Tab MUST andar entre as palavras e MUST deixar a grade na última e na primeira palavra, sem prender o foco (diverge do mockup, que cicla sem fim).
- **FR-010**: A mini cruzada MUST NOT chamar a API, MUST NOT usar dados de nenhuma fonte e MUST NOT guardar nada na conta, no progresso de visitante nem no armazenamento do navegador (regra da 048 mantida); as palavras e as dicas são inventadas para a página.
- **FR-011**: A seção das fontes MUST ter rótulo "Fontes", o título "N fontes, um só lugar." com N calculado, e uma linha por fonte conhecida pelo jogo, na ordem do jogo, com nome, descrição à mão e realce ao passar o mouse; a falta de descrição para uma fonte MUST continuar falhando na verificação de tipos, e a nota de atribuição da 048 (as cruzadas pertencem às fontes) MUST ser mantida.
- **FR-012**: A chamada final MUST ser uma faixa escura de largura total com o título "A cruzada de hoje já está esperando.", o botão "Jogar agora" (vai a `/jogar`) e o link para o calendário, sem criar rolagem horizontal.
- **FR-013**: A landing MUST usar Fraunces nos títulos, Roboto Mono nos rótulos e Roboto no texto, e MUST seguir os temas claro e escuro do mockup. As famílias de letra MUST ser servidas pelo próprio site, sem terceiros (FR-016 da 048 mantido e estendido a Roboto e Roboto Mono); o carregamento das letras MUST NOT mover nenhum elemento já exibido, e a feature MUST NOT acrescentar arquivos de letra nem mudar quais arquivos de letra as outras páginas carregam.
- **FR-014**: O estilo novo (cores, bordas de 2 px, sombras, botões amarelos, tipografia) MUST ficar restrito à landing; as demais páginas MUST ficar iguais às de antes da mudança.
- **FR-015**: A landing MUST manter todas as regras da 048 não substituídas aqui: texto fixo na página entregue, título e descrição próprios, indexação só da landing, ajuste "Ir direto ao jogo", abertura sem rede, links "Jogar" para `/jogar` e "calendário" para `/calendario`.
- **FR-016**: Com movimento reduzido, nenhuma animação nem transição da landing MUST rodar; a entrada animada ao rolar MUST ser apenas melhoria, com o conteúdo sempre legível sem ela.
- **FR-017**: A landing MUST ter contraste suficiente, foco visível e nomes acessíveis nos dois temas, sem rolagem horizontal em 360 px, verificada com a ferramenta de acessibilidade dos testes; nenhum elemento MUST mudar de lugar depois de aparecer.
- **FR-018**: A feature MUST mudar só o site: nenhuma rota, esquema, contrato de API ou dado muda, e a API segue compatível com a versão anterior do site.
- **FR-019**: O texto "Prévia de design" do rodapé do mockup, os botões que apontam para `#` e a lista fixa de fontes do mockup MUST NOT entrar na landing.

### Key Entities *(include if feature involves data)*

- **Amostra da mini cruzada**: grade 5x5 do mockup, seis palavras com respostas e dicas inventadas; vive só na página, sem persistência.
- **Fonte (na landing)**: nome vindo da lista única de fontes do jogo e descrição curta escrita à mão; uma por fonte (sem mudança em relação à 048).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em tela larga e em 360 px, 100% dos elementos listados em FR-001 a FR-012 estão presentes e na ordem do mockup, conferidos em revisão lado a lado com o mockup aprovado e por testes automatizados do texto.
- **SC-002**: Com movimento reduzido, 0 animações rodam na landing; com movimento permitido, nenhum elemento muda de lugar depois de aparecer.
- **SC-003**: Em 360 px não há rolagem horizontal, e a verificação de acessibilidade automática não aponta violações nos dois temas.
- **SC-004**: A mini cruzada é resolvida por inteiro com cada um dos três tipos de entrada, com 0 chamadas ao servidor e 0 itens guardados.
- **SC-005**: As demais páginas do site ficam visualmente idênticas às de antes (0 diferenças de estilo fora da landing).
- **SC-006**: Pedida sem scripts e sem a API, a página raiz continua trazendo 100% do texto fixo da landing (SC-001 da 048), incluindo os novos rótulos e títulos.
- **SC-007**: Acrescentar ou retirar uma fonte do jogo atualiza a contagem e as linhas da landing sem edição de texto à mão, exceto a descrição da fonte nova, cuja falta falha a verificação de tipos em 100% das tentativas.
- **SC-008**: Nenhuma requisição a servidores de letras de terceiros acontece ao abrir a landing.

## Assumptions

- O mockup aprovado (artefato indicado no Input) é o contrato visual desta feature, ao contrário da 048, que o tratava só como direção; onde o mockup e o código atual divergem, vale o mockup, exceto pelo que o FR-019 exclui e pelas regras da 048 mantidas em FR-015.
- O cabeçalho do site que a landing já usa (entrada, calendário, tema) é mantido; o logo "C" e o botão "Jogar hoje" do topo do mockup não substituem a navegação existente. Se a equipe quiser o cabeçalho do mockup também, é outra decisão.
- As cores e as sombras do mockup viram variáveis só da landing e os dois temas (claro e escuro) seguem a preferência do aparelho ou a escolha da pessoa, como no resto do site.
- Os textos do mockup valem como estão, com as correções que a 048 já impõe: a quantidade de fontes vem da lista do jogo, e as descrições das fontes continuam as de `source-descriptions` (as do mockup são ilustrativas).
- A amostra da mini cruzada do mockup (COSTA, MUNDO, OCASO, CAMPO, SONDA, ATOMO) substitui a atual; ela é inventada, sem conteúdo de fonte, como a anterior.
- "Mudar só o site" inclui o HTML pré-gerado: o texto novo precisa estar na página entregue (como na 048), e o plano decide como isso convive com o aplicativo instalado.
- Fraunces, Roboto e Roboto Mono já são servidas pelo próprio site (código aberto); o plano (`research.md`, R2) confirma que os pesos do mockup já estão incluídos, então nenhuma letra nova é adicionada.
- A entrada animada ao rolar do mockup é opcional; se o navegador não a suporta, o conteúdo aparece pronto.

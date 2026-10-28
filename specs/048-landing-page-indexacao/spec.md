# Feature Specification: Landing page pública e indexação no Google

**Feature Branch**: `feat/048-landing-page-indexacao`

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "https://github.com/BrunoYTanaka/cruzadinha/issues/122" (landing page pública e indexação no Google)

## Clarifications

### Session 2026-10-28

- Q: Enquanto "Ir direto ao jogo" está ligado e o site espera a API acordar, o que a pessoa vê? → A: A tela de espera do servidor que o site já usa; nunca a landing nem uma tela em branco.
  - Motivo: usabilidade: a espera pode durar quase um minuto na hospedagem gratuita, e a landing não deve aparecer para quem pediu para ir direto ao jogo.
- Q: Com "Ir direto ao jogo" ligado, o atalho vale só ao abrir o endereço ou a toda chegada em `/` (inclusive pelo logo do cabeçalho)? → A: A toda chegada em `/`: o site espera o servidor acordar e leva ao jogo; o calendário segue pelo link "Calendário".
  - Motivo: usabilidade: quem liga o ajuste quer sempre cair no jogo; hoje o atalho age uma vez por carregamento (feature 021), e passa a agir a cada chegada.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entender o site e começar a jogar (Priority: P1)

Quem chega ao endereço raiz vindo de fora (busca, link compartilhado) hoje cai direto no calendário da biblioteca e não sabe o que o site oferece. Passa a ver uma página de apresentação: o nome "CRUZADINHA" animado, uma chamada principal "Jogar a cruzada de hoje", três cartões (jogar sem conta, quatro fontes de cruzadas, funciona sem internet), uma linha com recursos menores (modo lápis, atalhos de teclado, tema claro e escuro), a seção das fontes e uma faixa final "Jogar agora".

**Why this priority**: É o objetivo da feature; sem a página o endereço raiz continua sem explicar o site.

**Independent Test**: Abrir o endereço raiz sem conta e sem uso anterior, ler a apresentação e chegar à cruzada de hoje com um toque na chamada principal.

**Acceptance Scenarios**:

1. **Given** uma pessoa sem conta, **When** abre o endereço raiz, **Then** vê a apresentação com um único título principal, os três cartões, a linha de recursos, a seção das fontes e a faixa final.
2. **Given** a landing aberta, **When** a pessoa aciona "Jogar a cruzada de hoje" ou "Jogar agora", **Then** chega ao jogo da fonte padrão do dia, como hoje o cartão da fonte padrão em "Hoje".
3. **Given** a landing aberta, **When** a pessoa procura outras datas ou fontes, **Then** um link claro leva ao calendário da biblioteca, que mantém tudo o que tem hoje.
4. **Given** o ajuste "Ir direto ao jogo" ligado, **When** a pessoa abre o endereço raiz, **Then** vê a tela de espera do servidor enquanto o site decide e vai direto ao jogo, como hoje, sem passar pela landing.
5. **Given** o ajuste "Ir direto ao jogo" ligado e a pessoa já dentro do site, **When** clica no logo do cabeçalho, **Then** o site espera o servidor, se preciso, e a leva ao jogo, sem mostrar a landing.

---

### User Story 2 - Ser encontrado no Google (Priority: P1)

Hoje o site pede que buscadores o ignorem em todas as páginas. A landing passa a poder ser indexada, com texto fixo que o buscador lê sem executar o site: título e descrição próprios e o conteúdo da apresentação já presentes na página entregue. As demais páginas continuam fora das buscas.

**Why this priority**: Sem isso a landing existe mas não é encontrada; é a razão de ser da mudança, com o mesmo peso da apresentação.

**Independent Test**: Pedir a página raiz sem executar scripts e conferir que título, descrição, o único título principal e o texto dos cartões e das fontes estão lá; conferir as instruções de não indexação em cada tipo de rota.

**Acceptance Scenarios**:

1. **Given** a página raiz pedida sem executar scripts nem chamar a API, **When** o conteúdo é lido, **Then** contém título e descrição próprios, um único título principal e o texto dos cartões, dos recursos e das fontes.
2. **Given** a landing, **When** um buscador lê as instruções do site, **Then** a landing pode ser indexada e há um mapa do site que a lista.
3. **Given** as páginas de jogo, de dia, do calendário, de conta, de login e cadastro e os links de e-mail, **When** um buscador lê as instruções, **Then** continuam sem indexação.

---

### User Story 3 - Experimentar uma cruzada na própria página (Priority: P2)

"Experimentar aqui" rola até uma mini cruzada 5x5 jogável na landing, com palavras e dicas só da amostra. Dá para preencher com mouse, teclado físico e teclado do celular, sem conta e sem enviar nada ao servidor.

**Why this priority**: Mostra o jogo antes de a pessoa decidir; a landing já cumpre o papel sem ela.

**Independent Test**: Tocar em "Experimentar aqui", ver a rolagem até a mini cruzada, preencher uma palavra com cada tipo de entrada e conferir que nenhuma chamada ao servidor acontece.

**Acceptance Scenarios**:

1. **Given** a landing, **When** a pessoa aciona "Experimentar aqui", **Then** a página rola suave até a mini cruzada (direto, sem animação, com movimento reduzido).
2. **Given** a mini cruzada, **When** a pessoa seleciona uma casa e digita pelo teclado físico ou pelo teclado do celular, **Then** a letra entra, a seleção avança e a palavra e a dica atuais ficam destacadas.
3. **Given** a mini cruzada resolvida, **When** a última letra certa é digitada, **Then** a página mostra que foi concluída, com convite a jogar a cruzada de hoje.
4. **Given** a mini cruzada em uso, **When** a pessoa joga, **Then** nenhuma chamada vai ao servidor e nada é salvo na conta nem no progresso de visitante.

---

### User Story 4 - Fontes sempre em dia com o jogo (Priority: P2)

A seção das fontes mostra uma entrada por fonte de cruzadas que o jogo conhece, com um texto curto sobre cada uma escrito à mão. Se uma fonte entra ou sai do jogo, entra ou sai da landing junto; esquecer o texto de uma fonte nova faz a verificação de tipos do projeto falhar.

**Why this priority**: Evita uma landing que mente sobre as fontes, mas só importa quando a lista mudar.

**Independent Test**: Comparar a seção com a lista de fontes do jogo; acrescentar uma fonte de teste sem descrição e ver a verificação de tipos acusar a falta.

**Acceptance Scenarios**:

1. **Given** as fontes do jogo, **When** a landing é aberta, **Then** a seção mostra exatamente uma entrada por fonte, na mesma ordem do jogo, cada uma com nome e descrição.
2. **Given** uma fonte nova sem descrição, **When** o projeto é verificado, **Then** a verificação de tipos falha.

---

### User Story 5 - Aparência e conforto em qualquer tela (Priority: P3)

A landing segue os temas claro e escuro, o movimento reduzido, o foco visível, o contraste e as telas de 360 px sem rolagem horizontal. As animações não atrasam a abertura e não empurram o conteúdo.

**Why this priority**: Qualidade transversal; a página funciona sem o polimento, mas a regra de interface do projeto o exige.

**Independent Test**: Abrir a landing nos dois temas, com e sem movimento reduzido, em 360 px, e percorrer tudo só com o teclado.

**Acceptance Scenarios**:

1. **Given** a preferência de movimento reduzido, **When** a landing abre, **Then** o título aparece pronto, sem letras caindo, e nada anima.
2. **Given** uma tela de 360 px, **When** a landing abre, **Then** não há rolagem horizontal.
3. **Given** os temas claro e escuro, **When** a landing é verificada com a ferramenta de acessibilidade dos testes, **Then** não há violações de contraste, nome acessível ou foco.
4. **Given** a animação do título, **When** a landing carrega, **Then** nenhum elemento muda de lugar depois de aparecer.

---

### Edge Cases

- Endereço raiz com "Ir direto ao jogo" ligado e o jogo indisponível (API fora do ar, sem rede): segue o tratamento atual do endereço raiz; a landing não passa a ser a tela de erro.
- Sem conexão: a landing abre da cópia do aplicativo instalado (feature 041), pois não precisa da API; só os botões que levam ao jogo seguem as regras atuais de conexão.
- Quem já tem conta e sessão aberta também vê a landing em `/`; o calendário fica a um link de distância.
- Com "Ir direto ao jogo" ligado e o atalho sem destino (cruzada concluída, fonte sem cruzada hoje ou fora do ar): a pessoa vai ao calendário com o motivo, também quando chega pelo logo; a landing só aparece com o ajuste desligado.
- Endereço antigo do calendário (`/`) em favoritos: passa a mostrar a landing; o calendário tem endereço próprio e a landing o aponta.
- JavaScript desativado ou lento: o texto da landing continua legível; a mini cruzada e a animação só funcionam com JavaScript.
- Dica ou palavra da mini cruzada igual a de uma cruzada de fonte: a amostra é inventada para a landing; nada é copiado de nenhuma fonte.
- Letras acentuadas na mini cruzada: comparadas sem acento, como no jogo.
- Mini cruzada com o jogo de verdade aberto em outra aba: independentes; nada compartilhado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O endereço raiz MUST mostrar a landing, e o calendário da biblioteca MUST passar a ter endereço próprio, alcançável por um link claro na landing e na navegação do site.
- **FR-002**: Com "Ir direto ao jogo" ligado, abrir o endereço raiz MUST levar ao jogo a toda chegada em `/` (ao abrir o endereço e ao usar o logo do cabeçalho), sem mostrar a landing; enquanto o site espera o servidor acordar, MUST mostrar a tela de espera do servidor já usada nas outras telas, nunca a landing nem uma tela em branco.
- **FR-003**: A landing MUST ter um único título principal, título de página e descrição próprios, e todo o texto fixo (cartões, recursos, fontes, faixa final) MUST estar na página entregue, legível sem executar scripts e sem chamar a API.
- **FR-004**: A landing MUST ter a chamada principal "Jogar a cruzada de hoje", o link "Experimentar aqui", três cartões (jogar sem conta, quatro fontes de cruzadas, funciona sem internet), a linha de recursos menores (modo lápis, atalhos de teclado, tema claro e escuro), a seção das fontes e a faixa final "Jogar agora".
- **FR-005**: Os botões da landing MUST usar os botões padrão do site, e ela MUST seguir as demais regras de interface do projeto (um título principal por página, temas claro e escuro).
- **FR-006**: O título "CRUZADINHA" MUST aparecer com as letras caindo em casas de cruzada; com movimento reduzido MUST aparecer pronto, sem animação.
- **FR-007**: As animações MUST NOT atrasar a abertura da página nem deslocar o conteúdo já visível.
- **FR-008**: "Experimentar aqui" MUST rolar suave até a mini cruzada, ou direto quando o movimento é reduzido.
- **FR-009**: A mini cruzada 5x5 MUST ser jogável com mouse, teclado físico e teclado do celular, usar palavras e dicas escritas só para a amostra, e MUST NOT usar dados de nenhuma fonte, chamar a API nem guardar progresso na conta ou no progresso de visitante.
- **FR-010**: A seção das fontes MUST listar uma entrada por fonte conhecida pelo jogo, na ordem do jogo, a partir da lista única de fontes; a descrição de cada uma MUST ser escrita à mão e a falta de descrição para uma fonte MUST falhar na verificação de tipos.
- **FR-011**: As descrições das fontes MUST dizer o que cada uma é e que o conteúdo pertence a ela, sem copiar texto, dicas, grades ou marcas das fontes.
- **FR-012**: A landing MUST permitir indexação por buscadores; o site MUST publicar um mapa do site que liste só a landing.
- **FR-013**: Todas as outras rotas (calendário, dia, jogo, conta, login, cadastro, recuperação de senha, links de e-mail, status) MUST continuar com a instrução de não indexação.
- **FR-014**: A landing MUST NOT mostrar erro nem depender de rede ou API para abrir; MUST abrir também sem conexão a partir do aplicativo instalado.
- **FR-015**: A landing MUST ter contraste suficiente, foco visível e nomes acessíveis nos dois temas, sem rolagem horizontal em 360 px, e MUST ser verificada com a ferramenta de acessibilidade dos testes.
- **FR-016**: As fontes de letra novas da landing (título) MUST ser servidas pelo próprio site, sem terceiros.
- **FR-017**: A feature MUST mudar só o site; a API, os dados e os contratos MUST ficar como estão, compatíveis com a versão anterior da API.
- **FR-018**: A constituição do projeto (princípio VIII, hoje "MUST NOT ser divulgado em buscadores … para todas as páginas") MUST ser emendada na mesma entrega para permitir a indexação só da landing, com a justificativa registrada, antes de o código que remove a instrução de não indexação ser mesclado.

### Key Entities *(include if feature involves data)*

- **Fonte (na landing)**: nome vindo da lista única de fontes do jogo e descrição curta escrita à mão; uma por fonte.
- **Amostra da mini cruzada**: grade 5x5, palavras e dicas inventadas para a landing; vive só na página, sem persistência.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Pedida sem scripts e sem a API, a página raiz traz 100% do texto fixo da apresentação, um título principal, título e descrição próprios.
- **SC-002**: Uma pessoa sem conta chega à cruzada de hoje a partir do endereço raiz em no máximo 2 toques ou cliques.
- **SC-003**: 100% das rotas fora da landing continuam com instrução de não indexação, e a landing é a única listada no mapa do site.
- **SC-004**: Em 360 px de largura não há rolagem horizontal, e a verificação de acessibilidade automática não aponta violações nos dois temas.
- **SC-005**: Com movimento reduzido, 0 animações rodam na landing, e nenhum elemento muda de lugar após aparecer, em qualquer modo.
- **SC-006**: A mini cruzada é resolvida por inteiro com cada um dos três tipos de entrada, com 0 chamadas ao servidor durante o uso.
- **SC-007**: Adicionar uma fonte sem descrição faz a verificação de tipos falhar em 100% das tentativas.
- **SC-008**: Com "Ir direto ao jogo" ligado, 0 quadros com o conteúdo da landing aparecem ao abrir `/` ou ao usar o logo; até a decisão, a pessoa vê só a tela de espera do servidor.

## Assumptions

- A landing fica no endereço raiz e o calendário ganha um endereço novo (o plano define o nome); a prévia visual do issue #122 é a direção aprovada do desenho, não um contrato pixel a pixel.
- "Jogar a cruzada de hoje" leva à fonte padrão, como o cartão correspondente em "Hoje" faz hoje.
- Como a landing é pública e sem conta, nada nela depende de sessão; a navegação do site continua a mesma nas demais páginas.
- Como gerar o texto já pronto para o buscador (página pré-gerada no build ou HTML estático à parte) e como isso convive com o aplicativo instalado e com `check:deps` é decisão do plano, não desta spec; o requisito é o resultado de FR-003 e FR-014.
- A emenda da constituição (FR-018) é uma mudança de versão MAIOR ou MENOR conforme o rito do projeto, decidida na emenda; o texto "sem indexação" continua valendo para todo o resto do site.
- O mapa do site precisa do endereço público definitivo do site; o plano o lê da configuração existente ou o registra como pendência de publicação.
- O uso de "quatro fontes" no cartão acompanha a lista de fontes; se o número mudar, o texto não deve ficar desatualizado (o plano decide se o número é calculado).
- Quem entra na conta (ou volta do login) vai ao calendário, não à landing; a landing é a porta de quem chega de fora.
- Esta feature substitui o FR-014 da feature 021 (o atalho valia só ao abrir o endereço raiz): passa a valer a toda chegada em `/`. A "volta ao calendário pelo cabeçalho" que ele excluía passa pelo link "Calendário" (`/calendario`), que nunca aciona o atalho; o FR-013 da 021 vale como está, com o calendário em `/calendario`.
- Nome da fonte de letra do título (Fraunces) vem do protótipo do issue; o plano confirma a licença e o peso do arquivo.

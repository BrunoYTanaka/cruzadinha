# Feature Specification: Compartilhar o resultado sem spoiler

**Feature Branch**: `feat/052-compartilhar-resultado`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: https://github.com/BrunoYTanaka/cruzadinha/issues/109 — "Botão no diálogo de conclusão que copia texto (e talvez imagem) com fonte, data e tempo, sem revelar letras." (origem: #90)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Copiar o resultado ao concluir (Priority: P1)

Ao terminar uma cruzada, a pessoa vê o diálogo "Cruzada concluída". Nele há um botão "Compartilhar", com o ícone de compartilhar. Ele abre, na mesma janela, as opções "Compartilhar texto" e "Compartilhar imagem", e um botão "Voltar". Ao tocar em "Compartilhar texto", um texto curto vai para a área de transferência, com o nome da fonte, a data da cruzada e o tempo. Ela cola o texto numa conversa e os amigos veem o resultado sem saber nenhuma resposta.

**Why this priority**: É o pedido todo: sem isso não há o que entregar. Funciona sozinho, sem conta e sem rede.

**Independent Test**: Concluir uma cruzada, tocar em "Compartilhar" e depois em "Compartilhar texto", colar o texto em um campo e conferir fonte, data e tempo.

**Acceptance Scenarios**:

1. **Given** o diálogo de conclusão aberto, **When** a pessoa toca em "Compartilhar", **Then** a janela mostra "Compartilhar texto", "Compartilhar imagem" e "Voltar".
2. **Given** a tela de compartilhar, **When** a pessoa toca em "Compartilhar texto", **Then** o texto é copiado e um aviso curto "Resultado copiado" aparece.
3. **Given** o texto copiado, **When** a pessoa o cola, **Then** ele traz o nome da fonte, a data da cruzada e o tempo no mesmo formato mostrado em "Seu tempo".
4. **Given** uma cruzada concluída no site, **When** o texto é gerado, **Then** ele não contém nenhuma letra da solução, nenhuma dica, nenhuma palavra do tabuleiro e nenhuma forma da grade.
5. **Given** uma pessoa sem conta (visitante), **When** conclui e compartilha o texto, **Then** o resultado é copiado igual ao de quem tem conta.
6. **Given** a tela de compartilhar, **When** a pessoa toca em "Voltar" ou aperta `Esc`, **Then** volta ao resultado, sem fechar a janela, e o aviso anterior some.

---

### User Story 2 - Compartilhar mesmo quando copiar falha (Priority: P2)

Em alguns aparelhos ou navegadores a cópia automática não é permitida. A pessoa ainda consegue levar o resultado: o site abre o compartilhamento do aparelho quando existe, ou mostra o texto pronto para ser selecionado e copiado à mão.

**Why this priority**: Evita um botão que falha em silêncio, mas o caminho principal (US1) já entrega valor.

**Independent Test**: Negar a permissão de cópia e tocar em "Compartilhar texto"; o texto continua alcançável.

**Acceptance Scenarios**:

1. **Given** a cópia automática bloqueada e o aparelho sem compartilhamento próprio, **When** a pessoa toca em "Compartilhar texto", **Then** vê o texto do resultado selecionável e um aviso claro de que não foi copiado sozinho.
2. **Given** a cópia automática bloqueada e o aparelho com compartilhamento próprio, **When** a pessoa toca em "Compartilhar texto", **Then** pode enviar o mesmo texto por ele, e cancelar esse envio não mostra erro.

---

### User Story 3 - Compartilhar o resultado como imagem (Priority: P2)

Na tela de compartilhar, "Compartilhar imagem" desenha um cartão com a marca Cruzadinha, a fonte, a data e o tempo, e a pessoa o envia pelo compartilhamento do aparelho. Onde não há compartilhamento de arquivos (computador, por exemplo), a imagem é copiada ou baixada.

**Why this priority**: Pedido da issue ("e talvez imagem"); o texto (US1) já entrega o essencial, a imagem só deixa o resultado mais bonito em conversas e redes.

**Independent Test**: Concluir uma cruzada, tocar em "Compartilhar" e em "Compartilhar imagem" e conferir o cartão recebido ou baixado: fonte, data e tempo, sem letras, dicas nem grade.

**Acceptance Scenarios**:

1. **Given** o aparelho com compartilhamento de arquivos, **When** a pessoa toca em "Compartilhar imagem", **Then** a folha de compartilhamento abre com o cartão, e cancelar não mostra erro.
2. **Given** um aparelho sem compartilhamento de arquivos e com cópia de imagens, **When** a pessoa toca no botão, **Then** a imagem é copiada e o aviso "Imagem copiada" aparece.
3. **Given** um aparelho sem as duas opções, **When** a pessoa toca no botão, **Then** o cartão é baixado como arquivo PNG e o aviso "Imagem baixada" aparece.
4. **Given** qualquer cartão gerado, **When** a pessoa o vê, **Then** ele mostra só a marca, a fonte, a data e o tempo, os mesmos valores do texto.
5. **Given** que o cartão não pôde ser desenhado, **When** a pessoa toca no botão, **Then** vê o aviso "Não foi possível gerar a imagem."

---

### Edge Cases

- Cruzada concluída com ajudas: o texto e o cartão não contam nem revelam quais letras ou palavras foram ajudadas; o número de ajudas não entra.
- Cruzada concluída sem rede, ou com o melhor tempo ainda não confirmado: os botões funcionam, pois só usam dados do aparelho.
- Botão tocado várias vezes: cada toque copia o mesmo texto, sem duplicar nada.
- Cruzada de um dia antigo: a data é a da cruzada, não a de hoje.
- Leitor de tela: os botões têm nome claro, os ícones são decorativos e os avisos são anunciados.
- Ao ir e voltar entre as telas, o foco vai ao primeiro botão de compartilhar e depois ao "Compartilhar".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O diálogo de conclusão MUST oferecer o botão "Compartilhar", com o ícone de compartilhar, que troca o conteúdo da mesma janela pelas opções "Compartilhar texto" e "Compartilhar imagem" e por um botão "Voltar".
- **FR-002**: O texto compartilhado MUST conter o nome da fonte, a data da cruzada e o tempo do jogador, e MUST estar em português.
- **FR-003**: O texto MUST NOT conter letra da solução, dica, palavra do tabuleiro, forma da grade ou qualquer dado que permita deduzir uma resposta.
- **FR-004**: Ao tocar em "Compartilhar texto", o site MUST copiar o texto para a área de transferência e confirmar com um aviso não bloqueante.
- **FR-005**: Quando a cópia automática não for possível, o site MUST ainda deixar o texto acessível (compartilhamento do aparelho ou texto selecionável) e MUST dizer que não copiou sozinho.
- **FR-006**: Os botões de compartilhar MUST funcionar sem conta, sem rede e sem confirmação do servidor, usando só dados já presentes no aparelho.
- **FR-007**: O botão "Compartilhar" MUST ser acessível pelo teclado e por leitor de tela, e MUST NOT tirar o foco inicial nem a ordem dos botões atuais do diálogo (no fallback de texto, o foco pode ir ao campo depois do toque).
- **FR-008**: O texto MUST NOT incluir dados da pessoa (e-mail, nome, identificador de conta).
- **FR-009**: Nada MUST ser enviado a um servidor para gerar ou guardar o texto ou a imagem compartilhados.
- **FR-010**: "Compartilhar imagem" MUST gerar um cartão PNG com a marca, a fonte, a data e o tempo.
- **FR-011**: O cartão MUST NOT conter letra da solução, dica, palavra, número de casa nem forma da grade.
- **FR-012**: A imagem MUST ser entregue pelo compartilhamento de arquivos do aparelho; sem ele, copiada; sem isso, baixada. Cancelar o compartilhamento MUST NOT mostrar erro. Cada caminho MUST avisar o que aconteceu.
- **FR-013**: O cartão MUST ser legível em tema claro e escuro (ele tem as próprias cores).
- **FR-014**: A tela de compartilhar MUST ter o botão "Voltar" (com seta) e `Esc` MUST voltar ao resultado em vez de fechar a janela. Os botões "Compartilhar texto" e "Compartilhar imagem" MUST ter ícone e o mesmo estilo de letra, com ícones e textos alinhados entre si.

### Key Entities *(include if feature involves data)*

- **Resultado compartilhável**: texto curto e cartão de imagem derivados de uma conclusão, com fonte, data da cruzada e tempo. Não são guardados; são montados a cada toque.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Do diálogo de conclusão ao texto copiado, a pessoa leva dois toques ("Compartilhar" e "Compartilhar texto").
- **SC-002**: Em 100% dos textos gerados, nenhuma letra da solução nem dica aparece (conferido com cruzadas de teste de todas as fontes).
- **SC-003**: Em 100% das conclusões, com ou sem conta e com ou sem rede, o compartilhamento do texto entrega o resultado.
- **SC-004**: Quando a cópia automática é negada, 100% das tentativas ainda deixam o texto disponível à pessoa.
- **SC-005**: Em 100% das tentativas de "Compartilhar imagem", a pessoa recebe a imagem por compartilhamento, cópia ou arquivo baixado, ou o aviso de que não foi possível gerá-la.
- **SC-006**: Em 100% dos cartões gerados, só marca, fonte, data e tempo aparecem (conferido nos textos desenhados).

## Assumptions

- A imagem é um cartão de texto estilizado (marca, fonte, data, tempo). Grade com quadradinhos fica fora do escopo, porque mostraria a forma da grade.
- O texto traz fonte, data e tempo, exatamente o que a issue pede. O número de ajudas e o link do site não entram; podem ser somados depois sem mudar o resto.
- O tempo usa o mesmo formato de "Seu tempo" no diálogo; o nome da fonte vem dos nomes já exibidos no site.
- Os botões aparecem só no diálogo de conclusão, não na tela do tabuleiro nem na biblioteca.
- A segunda tela reaproveita a mesma janela (sem segunda janela por cima), para o foco continuar preso a uma só.
- Mudança só no site; API, contratos e dados não mudam. A atribuição à fonte (constituição VIII) fica atendida pelo nome da fonte no texto e no cartão, que não redistribuem conteúdo da cruzada.

# Feature Specification: Sessão só depois de o servidor acordar

**Feature Branch**: `fix/032-sessao-apos-servidor-acordar`

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "https://github.com/BrunoYTanaka/cruzadinha/issues/63" ([Bug]: tela pisca ou mostra erro na primeira abertura com a API dormindo)

## Contexto

A feature 012 (FR-008) fez o site esperar a API gratuita acordar antes de qualquer tela: durante a espera aparece "Carregando…" e, passados 2 s, "Acordando o servidor". Porém o site também consulta a sessão da pessoa (visitante ou conta, feature 013) ao abrir, e esse pedido sai ao mesmo tempo que a espera, ainda com a API dormindo. Resultado medido no issue #63, com a API simulada dormindo por cerca de 6 s:

| Tempo | Cabeçalho | Corpo da página |
|---|---|---|
| ~0,3 s | `Cruzadinha` | `Carregando…` |
| ~2,3 s | `Cruzadinha` | `Acordando o servidor` |
| ~6,4 s (servidor acordou) | `Cruzadinha \| Visitante \| Entrar` | `Algo deu errado — Não foi possível carregar a página` |

Se o pedido da sessão receber a resposta de visitante antes de o servidor acordar, o cabeçalho ganha "Visitante" e "Entrar" de uma vez, antes da mensagem de espera. O comportamento de produção (Cloudflare Pages com Render dormindo) ainda não foi medido: pode ser que o pedido da sessão fique parado até o servidor acordar, e então só o cabeçalho mude de repente. Nos dois casos o defeito é o mesmo: a sessão é consultada antes de o servidor estar pronto. Esta feature corrige a ordem, sem mudar a regra de espera da feature 012. O defeito é de bug; o fluxo segue a spec primeiro só para registrar a regra de ordem.

## User Scenarios & Testing *(mandatory)*

O ator é o jogador, visitante ou com conta, que abre o site com a API dormindo.

### User Story 1 - Abrir o site com a API dormindo sem tela de erro (Priority: P1)

A pessoa abre o site e, enquanto o servidor acorda, vê só as mensagens de espera. Quando ele fica pronto, aparece o calendário, sem tela de erro no meio.

**Why this priority**: É o defeito relatado. Uma tela de erro na primeira abertura faz a pessoa achar que o site está quebrado, justo na visita em que a API gratuita costuma dormir.

**Independent Test**: Com a API simulada dormindo (saúde sem resposta boa nas primeiras tentativas e sessão com falha até a saúde responder), abrir `/` sem sessão; o corpo mostra "Carregando…", depois "Acordando o servidor", depois o calendário, e a tela de erro nunca aparece.

**Acceptance Scenarios**:

1. **Given** a API dormindo e uma pessoa sem sessão, **When** ela abre `/`, **Then** a tela mostra só "Carregando…" e depois "Acordando o servidor" até o servidor ficar pronto, e então o calendário, sem "Algo deu errado" em nenhum momento.
2. **Given** a API dormindo e uma pessoa com sessão, **When** ela abre `/`, **Then** vale o mesmo, e o calendário aparece já com a conta dela.
3. **Given** a API dormindo, **When** a pessoa abre `/login`, `/cadastro` ou um endereço de jogo ou de dia, **Then** não aparece tela de erro enquanto o servidor acorda.
4. **Given** a API que continua sem acordar até o limite de espera da feature 012, **When** o limite chega, **Then** vale a tela de erro com nova tentativa da feature 012, e não a mensagem genérica "Algo deu errado".

---

### User Story 2 - Cabeçalho sem mudança brusca (Priority: P1)

O cabeçalho não anuncia "Visitante" e "Entrar" (nem a conta) antes de o servidor estar pronto; ele muda uma vez só, junto com o aparecimento do calendário.

**Why this priority**: O cabeçalho que pisca durante a espera é o segundo sintoma do mesmo defeito, e a pessoa com conta chega a ver "Entrar" por alguns segundos.

**Independent Test**: Com a API simulada dormindo, ler o cabeçalho a cada 250 ms; ele mostra só `Cruzadinha` enquanto a mensagem de espera está na tela e traz "Visitante" e "Entrar" (ou a conta) só no mesmo instante em que o calendário aparece.

**Acceptance Scenarios**:

1. **Given** a API dormindo e a sessão que responderia "visitante" cedo, **When** a pessoa abre o site, **Then** o cabeçalho mostra só `Cruzadinha` até o servidor ficar pronto.
2. **Given** o servidor pronto, **When** o calendário aparece, **Then** o cabeçalho já mostra a identidade correta (visitante ou conta) no mesmo quadro, sem um segundo ajuste depois.

---

### User Story 3 - API acordada continua como hoje (Priority: P2)

Quando a API já está acordada, a abertura do site não fica mais lenta nem muda de aparência.

**Why this priority**: A correção não pode piorar o caso comum, em que a API responde de imediato.

**Independent Test**: Com a API respondendo na hora, abrir `/`; o calendário aparece sem passar por "Acordando o servidor" e sem atraso a mais que o de hoje.

**Acceptance Scenarios**:

1. **Given** a API acordada, **When** a pessoa abre o site, **Then** o calendário aparece como hoje, sem mensagem de espera.
2. **Given** o servidor já tido como pronto na visita, **When** a pessoa navega entre telas, **Then** nenhum pedido novo é atrasado por uma espera adicional.
3. **Given** a pessoa dentro de uma partida carregada, **When** a API dorme de novo, **Then** valem os avisos que não bloqueiam e o salvamento em fila (FR-011 da feature 012 e FR-032 da feature 010), sem tela de espera nem de erro.

---

### Edge Cases

- **Sessão com falha depois de o servidor acordar** (erro de rede ou 5xx real, não o sono da API): vale a tela de erro da rota de hoje; esta feature só garante que o pedido da sessão não saia antes da hora.
- **Sessão expirada ou cookie inválido** (resposta de não autorizado): continua tornando a pessoa visitante, como na feature 013, depois de o servidor estar pronto.
- **Pessoa sai da tela durante a espera** (navega para `/status` ou fecha a aba): a espera é cancelada como hoje e nenhum pedido de sessão fica pendente.
- **`/status`**: continua sem esperar o servidor, pois mostra a própria saúde, e não depende da sessão.
- **Produção com o proxy segurando o pedido da sessão**: o resultado é o mesmo, pois a sessão só é pedida depois de a saúde responder.
- **Recarga com o servidor já acordado no navegador mas dormindo na API**: a página nova começa do zero e segue as histórias 1 e 2.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O pedido da sessão MUST sair só depois de o servidor ser tido como pronto (a mesma condição que encerra a tela de espera da feature 012, `isServerReady`); antes disso, nenhum pedido à API além da verificação de saúde pode sair por causa da abertura do site (isso inclui a consulta de sessão feita pelo atalho "Ir direto ao jogo", feature 021, que MUST funcionar na primeira abertura com a API dormindo depois de ela acordar).
- **FR-002**: Enquanto o servidor acorda, o corpo da página MUST mostrar só as mensagens de espera da feature 012 ("Carregando…" e, depois de 2 s, "Acordando o servidor"), sem a tela "Algo deu errado".
- **FR-003**: Enquanto o servidor acorda, o cabeçalho MUST mostrar só o nome do site, sem "Visitante", "Entrar" nem a conta.
- **FR-004**: Quando o servidor ficar pronto, o calendário e o cabeçalho com a identidade correta MUST aparecer juntos, sem tela de erro e sem um segundo ajuste do cabeçalho.
- **FR-005**: As regras de espera da feature 012 (aviso aos 2 s, limite de 90 s, nova tentativa, `/status` sem espera, nenhuma tela de espera dentro de uma partida) MUST continuar iguais.
- **FR-006**: Com a API já acordada, a abertura do site MUST NOT ganhar nenhum passo nem atraso perceptível em relação a hoje.
- **FR-007**: Uma falha real da sessão, depois de o servidor estar pronto, MUST continuar levando à tela de erro da rota, como hoje.
- **FR-008**: A correção MUST NOT mudar nenhum endereço do site, nenhum dado salvo no aparelho ou na conta, nem o contrato com a API (a mudança é só no site; um site novo continua funcionando com a API atual).

### Key Entities

Nenhuma entidade nova. A única informação envolvida é o estado "servidor pronto" da feature 012, que passa a preceder a consulta da sessão.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das aberturas de `/` com a API simulada dormindo (sessão com falha ou com resposta de visitante antes de a saúde responder), a tela de erro "Algo deu errado" nunca aparece.
- **SC-002**: Em 100% dessas aberturas, o cabeçalho mostra só o nome do site enquanto a mensagem de espera está na tela, e a identidade (visitante ou conta) aparece no mesmo quadro do calendário.
- **SC-003**: Com a API acordada, a abertura do site não ganha nenhuma espera nem pedido a mais em relação a hoje (a sessão é pedida na hora, sem nova consulta de saúde).
- **SC-004**: Nenhuma configuração salva, progresso ou sessão muda por causa da correção.

## Assumptions

- O comportamento exato do proxy da Cloudflare com o Render dormindo ainda não foi medido; a regra de ordem (FR-001) vale nos dois casos possíveis, por isso a feature não depende dessa medição, embora ela deva ser anotada nos achados se for feita.
- "Servidor pronto" é o mesmo estado que a feature 012 já usa para encerrar a espera; esta feature não cria outra definição.
- O defeito aparece nas telas `/`, `/dia/:date` e `/jogo/:puzzleId` (as que consultam a sessão ao abrir); `/login` e `/cadastro` já esperam o servidor e não consultam a sessão por loader, então só não podem regredir (cenário 3 da história 1).
- A feature muda só o site; a API e o formato dos dados ficam como estão.
- O teste de regressão nasce falhando: sessão devolvendo erro 503 antes de a saúde responder, como no issue #63, e é commitado junto da correção.

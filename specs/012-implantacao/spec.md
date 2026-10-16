# Feature Specification: Implantação

**Feature Branch**: `feat/012-implantacao`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "implantação: API no Render, banco no Neon, front no Cloudflare Pages com Pages Function de proxy para /api, tela "acordando o servidor" no cold start"

## Clarifications

### Session 2026-10-15

- Q: Onde a cruzadinha deve ser implantada (design original, AWS com container e RDS, ou AWS com Lambda)? → A: Design original: Cloudflare Pages (site e repasse de `/api`), Render no plano gratuito (API) e Neon no plano gratuito (banco). A AWS foi descartada: a versão com container e RDS custa cerca de US$ 20–25/mês depois dos créditos, e a versão com Lambda troca o cold start por uma entrada nova e risco de cobrança numa conta sem teto de gasto.
- Q: Em qual região ficam a API e o banco? → A: Os dois na costa leste dos EUA: API no Render em Virgínia (US East) e banco no Neon em `us-east-1`. O provedor da API não tem região no Brasil, e manter API e banco juntos evita que cada consulta atravesse o continente.

### Session 2026-10-16

- Q: O deploy deve publicar só a parte afetada pela mudança, ou sempre as duas? → A: (Ajustada pela pergunta seguinte: o gatilho deixou de ser cada merge e passou a ser o lançamento de versão; vale a ideia de publicar só a parte afetada. As listas de caminhos abaixo passaram a definir só que mudança conta para a versão de cada parte, em FR-022, sem `package-lock.json`.) Só a parte afetada, comparando com a versão que está no ar (e não só com o commit anterior). A API é publicada quando mudam `apps/api/`, `packages/shared/`, `package-lock.json` ou `render.yaml`. O site é publicado quando mudam `apps/web/` (inclusive a função de repasse), `packages/shared/` ou `package-lock.json`. Mudanças só em `docs/`, `specs/` ou `.claude/` não publicam nada. O disparo manual publica as duas partes.
- Q: A publicação em produção deve continuar a cada merge na `main`, ou só quando uma versão nova for lançada? → A: Só quando uma versão nova for lançada.
  - **Numeração**: a API e o site têm números de versão próprios (MAJOR.MINOR.PATCH), calculados sozinhos a partir dos commits no padrão Conventional Commits que tocam cada parte (`fix` sobe o patch, `feat` o minor e mudança incompatível o major). Commits de documentação, manutenção e CI não geram versão.
  - **Pedido de lançamento**: os merges na `main` vão sendo acumulados num pedido de lançamento, que se atualiza sozinho com os números novos e o registro de mudanças de cada parte.
  - **Publicação**: quando o autor aceita esse pedido, as versões ganham marcação no histórico e só as partes com versão nova são publicadas, sem passo manual.
  - **Reversão**: republica a versão anterior pela marcação.
  - **`package.json` e registro de mudanças**: nunca são editados à mão.
- Ajustes vindos do `/speckit-analyze` (sem pergunta nova):
  - O pedido de lançamento passa pela verificação automática, com um token próprio para a ferramenta de lançamento, em vez de aceitar que ele ficasse sem CI. Assim o princípio II da constituição fica intacto, e nenhuma emenda é necessária (FR-022, Assumptions).
  - Abas abertas sobrevivem a uma publicação do site (FR-024).
  - Cada versão é compatível com a anterior (FR-025).
  - A reversão automática fica fora do escopo (Contexto).
  - Ficou explícito que caminhos contam para a versão de cada parte (FR-022).
- Ajustes vindos do `/speckit-plan` (limites da ferramenta de lançamento, research R12):
  - O `render.yaml` não conta para a versão da API.
  - Uma mudança só em `packages/shared/` sobe o patch da API e do site, e não conforme o tipo do commit.
  - O código compartilhado tem uma versão interna, sem publicação.
- Q: Onde deve ficar a documentação das versões e de como elas funcionam? → A: Num documento próprio, `docs/versionamento.md`. O roteiro de implantação aponta para ele. O README tem um link de acesso e um resumo curto, e o `CLAUDE.md` também tem um resumo curto com o link, para a regra estar onde os commits são escritos.

## Contexto

As features 001 a 011 entregaram o site completo, mas ele só roda na máquina do autor. Esta feature o coloca no ar, para o autor e os amigos convidados jogarem de qualquer aparelho. É o item 8, o último, da ordem de implementação de `docs/design.md`, e segue a seção 9 do design (infra e implantação):

- Custo zero e sem prazo de expiração.
- O site (front estático) fica no Cloudflare Pages, a API (container do `apps/api/Dockerfile`) no Render, no plano gratuito, e o banco no Neon.
- O site e a API aparecem para o navegador no **mesmo endereço**: o site repassa `/api/*` para a API. Assim o cookie de sessão continua `HttpOnly` e `SameSite=Lax`, sem CORS (constituição, princípio VI).
- A coleta diária, que já existe (`collect.yml`), passa a gravar no banco de produção.
- No plano gratuito a API dorme depois de 15 minutos sem uso e leva até cerca de 1 minuto para acordar (documentação do provedor em 2026-10). O site precisa explicar essa espera em vez de parecer quebrado.

A troca de provedor continua sendo só troca de implantação, sem mudar código de aplicação (constituição, restrições técnicas).

Fora do escopo: domínio próprio, manter a API acordada artificialmente, ambiente de homologação separado, monitoramento pago, backup além do que o plano gratuito do banco oferece, recuperação de senha, mudanças de regra de jogo e **reversão automática**. Uma versão que sobe mas tem defeito é revertida pelo autor, pelo roteiro; a publicação só avisa (FR-015). A única reversão automática é a do próprio provedor da API, que mantém a versão anterior quando a nova não sobe (FR-013).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Jogar pelo site publicado (Priority: P1)

Um amigo convidado abre o endereço público do site no celular ou no computador, se cadastra com o convite, entra, escolhe um dia no calendário e joga. Depois continua a mesma partida em outro aparelho, com o progresso salvo.

**Why this priority**: é o objetivo do projeto ("o usuário entra, escolhe uma data do O Globo, joga [...] e o progresso fica salvo entre dispositivos"). Sem o site no ar, nenhuma outra história tem valor.

**Independent Test**: com o site publicado, criar um convite para uma conta de teste, cadastrar-se pelo endereço público, jogar algumas letras num aparelho, abrir a mesma cruzada em outro e conferir que as letras estão lá.

**Acceptance Scenarios**:

1. **Given** o site publicado, **When** alguém abre o endereço público, **Then** o site carrega por conexão segura e mostra a tela de login.
2. **Given** um convite válido, **When** a pessoa se cadastra e entra pelo endereço público, **Then** a sessão fica guardada num cookie do próprio endereço do site, que o código da página não lê, e continua valendo ao recarregar.
3. **Given** a pessoa logada, **When** ela joga e depois abre a mesma cruzada em outro aparelho, **Then** o progresso aparece igual (feature 008).
4. **Given** o site publicado, **When** alguém acessa um endereço interno do site (por exemplo `/dia/2026-10-01`) direto pela barra de endereço ou recarrega a página, **Then** o site abre a tela certa, e não uma página de "não encontrado" do provedor.
5. **Given** o site publicado, **When** alguém pede a documentação da API, **Then** a resposta é "não encontrado", como já acontece em produção.
6. **Given** o site publicado, **When** um buscador o visita, **Then** o site pede para não ser indexado.

---

### User Story 2 - Espera clara enquanto o servidor acorda (Priority: P1)

Quem abre o site depois de um tempo sem uso vê uma tela "Acordando o servidor", que explica que a primeira visita pode levar até um minuto. Quando a API responde, o site segue sozinho para a tela pedida, sem a pessoa recarregar.

**Why this priority**: no plano gratuito isso acontece quase toda vez que alguém abre o site. Sem a tela, a primeira impressão é de site quebrado ou travado, e a pessoa desiste ou recarrega sem parar.

**Independent Test**: com a API dormindo (ou simulando uma resposta lenta), abrir o site e conferir que a tela de espera aparece em até 3 s e que a tela de login ou a biblioteca abre sozinha quando a API responde.

**Acceptance Scenarios**:

1. **Given** a API dormindo, **When** a pessoa abre o site, **Then** em até 3 s aparece a tela "Acordando o servidor", com um indicador de progresso e a explicação de que pode levar até um minuto.
2. **Given** a tela de espera, **When** a API responde, **Then** o site segue sozinho para a tela pedida (login, biblioteca ou o dia do endereço), sem recarregar e sem perder o endereço original.
3. **Given** a API acordada, **When** a pessoa abre o site, **Then** a tela de espera não aparece, nem por um instante.
4. **Given** a tela de espera, **When** a API não responde em 90 s, **Then** a tela troca para uma mensagem de erro com o botão "Tentar de novo", que volta a esperar sem recarregar a página.
5. **Given** a tela de espera, **When** a pessoa usa leitor de tela, **Then** ele anuncia a espera e, depois, a mudança de tela; o indicador respeita a preferência de movimento reduzido.
6. **Given** uma partida em andamento, **When** a API demora a responder (por exemplo, dormiu durante uma pausa longa), **Then** a tela de espera não aparece: valem os avisos que não bloqueiam e o salvamento em fila da feature 010 (FR-032 da feature 010).

---

### User Story 3 - Lançar e publicar versões sem trabalho manual (Priority: P2)

Cada merge na `main` atualiza sozinho um pedido de lançamento, com o número da próxima versão da API e do site e o registro do que mudou em cada um. Quando o autor aceita esse pedido, as versões são marcadas e só as partes com versão nova são publicadas, sem outro passo manual. As migrações de banco são aplicadas antes da API nova atender pedidos.

**Why this priority**: o site já tem várias features e continuará recebendo outras. Sem versão e publicação automáticas, cada lançamento vira um roteiro manual sujeito a erro, e não fica claro o que está no ar. Ainda assim, o site funciona sem isso.

**Independent Test**: fazer o merge de um `feat(web)` e de um `fix(api)`. Conferir que o pedido de lançamento propõe o site com o minor acima e a API com o patch acima, cada um com seu registro de mudanças. Aceitar o pedido e conferir, sem passo manual, que em até 15 minutos o endereço público mostra as duas versões novas.

**Acceptance Scenarios**:

1. **Given** um merge na `main` de um commit `feat` que toca o site, **When** a verificação automática passa, **Then** o pedido de lançamento passa a propor o minor seguinte do site, com o commit listado no registro de mudanças do site, e nada é publicado ainda.
2. **Given** o pedido de lançamento com versões novas da API e do site, **When** o autor o aceita e a verificação automática passa, **Then** as duas versões recebem marcação no histórico e são publicadas; o site e a API publicados informam esses números.
3. **Given** o pedido de lançamento com versão nova só do site, **When** o autor o aceita, **Then** só o site é publicado, e a API não é republicada nem reiniciada.
4. **Given** um merge na `main` só com commits `docs`, `chore` ou `ci`, **When** a verificação automática passa, **Then** nenhuma versão nova é proposta e nada é publicado.
5. **Given** um aceite do pedido de lançamento com a verificação automática reprovada, **When** ela termina, **Then** nada é publicado e as versões anteriores continuam no ar.
6. **Given** uma versão nova com migração de banco, **When** a API nova sobe, **Then** a migração é aplicada antes de ela atender pedidos; se a migração falhar, a API nova não entra no ar e a anterior continua atendendo.
7. **Given** uma versão publicada com defeito, **When** o autor segue o roteiro de reversão e indica a versão anterior (por exemplo, `api` 1.2.0), **Then** essa versão volta ao ar em até 15 minutos.
8. **Given** uma publicação da API que falhou num lançamento anterior, **When** o lançamento seguinte traz versão nova só do site, **Then** a API também é publicada, porque a comparação é entre a versão no ar e a última versão lançada de cada parte.
9. **Given** um pull request aberto, **When** ele é atualizado, **Then** nenhuma cópia do site ligada ao banco de produção é publicada.

---

### User Story 4 - Coleta diária no banco de produção (Priority: P2)

Com o banco de produção cadastrado nos segredos da CI, a coleta agendada (feature 006) grava as cruzadas de cada dia no banco de produção, mesmo com a API dormindo, e o calendário mostra o dia novo sem ninguém precisar buscá-lo.

**Why this priority**: a coleta é a garantia de que nenhum puzzle se perde (design, seção 4), mas o site funciona sem ela, porque a busca sob demanda cobre o dia que faltar.

**Independent Test**: disparar a coleta à mão depois de cadastrar o segredo e conferir que ela termina com sucesso e que o dia de hoje aparece no calendário publicado.

**Acceptance Scenarios**:

1. **Given** o segredo do banco cadastrado, **When** a coleta agendada roda, **Then** ela grava no banco de produção os dias que faltam, sem depender da API acordada.
2. **Given** uma coleta que falha, **When** ela termina, **Then** o autor é avisado pela notificação de falha da CI.
3. **Given** o repositório sem atividade por quase 60 dias, **When** o prazo do provedor da CI se aproxima, **Then** o roteiro diz ao autor como saber se o agendamento foi desativado e como reativá-lo.

---

### User Story 5 - Recriar a implantação a partir do roteiro (Priority: P3)

O autor tem um roteiro, versionado no repositório, que leva do zero ao site no ar: criar as contas, o banco, a API e o site, cadastrar os segredos, criar o primeiro convite, reverter uma versão e trocar um segredo vazado. O roteiro não contém nenhum valor real.

**Why this priority**: a implantação é feita uma vez, mas é a parte mais difícil de lembrar. O roteiro também prova a portabilidade pedida pelo design.

**Independent Test**: outra pessoa (ou o autor, num provedor recém-criado) segue o roteiro sem ajuda e chega ao site no ar com uma conta funcionando.

**Acceptance Scenarios**:

1. **Given** o roteiro, **When** o autor o segue em contas novas nos provedores, **Then** chega ao site no ar e à primeira conta sem consultar outra fonte.
2. **Given** o site recém-publicado e sem contas, **When** o autor segue o roteiro, **Then** consegue criar o primeiro convite para o banco de produção, cadastrar-se e convidar os amigos.
3. **Given** um segredo vazado (por exemplo, o endereço do banco), **When** o autor segue o roteiro, **Then** troca o segredo em todos os lugares onde ele é usado e o antigo deixa de funcionar.

---

### Edge Cases

- API dormindo e a pessoa abre direto um endereço interno (por exemplo, o link de um dia): a tela de espera aparece e, ao acordar, o site abre aquele dia, sem passar pela biblioteca.
- API acorda e a sessão expirou nesse meio-tempo: depois da espera o site vai ao login, com a volta ao endereço original (`?next=`, feature 010).
- Banco também dormindo (o banco gratuito suspende depois de alguns minutos sem uso): a espera soma os dois tempos e continua coberta pela tela de espera e pelo limite de 90 s.
- Pedido que chega à API sem passar pelo site (direto no endereço do provedor da API): não é atendido, para ninguém contornar os limites de tentativas inventando o próprio endereço (FR-005). A verificação de saúde do provedor continua funcionando.
- Muitas pessoas usando o site ao mesmo tempo atrás do repasse: os limites de tentativas (login, cadastro, convites, busca na fonte) continuam contando por pessoa, pelo endereço real de cada uma, e não somam todos num só.
- A API cai ou reinicia no meio de uma partida: valem os avisos que não bloqueiam e a fila de salvamento da feature 010; a tela de espera não aparece por cima do jogo.
- Pedido longo de busca na fonte (dia passado não salvo, feature 010) com a API recém-acordada: o repasse não pode cortar o pedido antes de a API responder ou de a página desistir.
- Merge com migração que falha: a API nova não sobe, a anterior continua atendendo e o autor é avisado.
- Commit `feat` ou `fix` só em `packages/shared/`: sobe o **patch** da API e do site, com uma entrada "dependências atualizadas" no registro de mudanças de cada um, porque os dois usam o código compartilhado. Para subir o minor de uma parte, o commit precisa tocar a pasta dela (plano, R12).
- Commit que toca a API e o site ao mesmo tempo: aparece no registro de mudanças das duas partes, e cada uma sobe conforme o tipo do commit.
- Vários merges antes do aceite: o pedido de lançamento acumula todos e propõe a maior subida necessária (um `feat` e três `fix` resultam em um minor).
- Mudança incompatível (`!` ou rodapé `BREAKING CHANGE`) numa parte ainda abaixo de 1.0.0: sobe o minor, e não o major, até o autor decidir lançar a 1.0.0.
- Aceite de um novo pedido de lançamento enquanto a publicação anterior ainda roda: as publicações rodam em fila, e cada uma compara com o que estiver no ar quando começar.
- Pedido de lançamento editado à mão (título ou números): o próximo merge o recalcula; o roteiro orienta não editar.
- Plano gratuito do provedor da API esgotado no mês (horas de execução ou banda de saída): a API fica fora do ar até o mês virar; o site mostra o erro de FR-008 e o roteiro explica a causa e como conferir o consumo.
- Coleta e API escrevendo ao mesmo tempo o mesmo dia: já é idempotente (feature 006), sem duplicar o dia.
- Navegador com cookies de terceiros bloqueados: não afeta, porque a sessão é do próprio endereço do site.
- Aba aberta durante uma publicação do site, com a pessoa no meio de uma partida: a partida continua, porque o código do jogo já está carregado. Ao navegar para uma tela cujo código mudou, vale FR-024: a página recarrega uma vez, e as letras não enviadas continuam guardadas no aparelho (feature 010).
- Publicação em que só a API muda e a versão nova acrescenta um campo na resposta: o site anterior ignora o campo, porque a validação dele aceita campos extras ou o campo é opcional (FR-025).
- Versão publicada com defeito: o autor reverte pelo roteiro; nada é revertido sozinho (fora do escopo).
- Reversão seguida de outro merge na `main`: a publicação automática compara a última versão lançada com a que está no ar e publica de novo a última, o que desfaz a reversão. A reversão vale até o próximo merge; para mantê-la, o autor lança uma versão de correção (por exemplo, revertendo o commit com defeito) antes ou logo depois. O roteiro e a documentação de versionamento avisam disso.

## Requirements _(mandatory)_

### Functional Requirements

**Site e API publicados**

- **FR-001**: O site MUST ficar disponível num endereço público fixo, só por conexão segura (HTTPS); um acesso sem conexão segura MUST ser levado à versão segura.
- **FR-002**: O site MUST repassar todos os pedidos de `/api/*` para a API, de forma transparente para o navegador: mesmo endereço, mesmo método, corpo, cabeçalhos relevantes e respostas (inclusive o cookie de sessão, códigos de erro e `Retry-After`). O navegador MUST NOT falar direto com o endereço do provedor da API.
- **FR-003**: O cookie de sessão MUST continuar `HttpOnly`, `SameSite=Lax` e, em produção, `Secure`, valendo para o endereço do site, sem CORS.
- **FR-004**: Endereços internos do site (rotas da aplicação) MUST abrir a tela certa quando acessados diretamente ou recarregados.
- **FR-005**: A API publicada MUST atender só pedidos repassados pelo site; um pedido direto ao endereço do provedor da API MUST ser recusado, com exceção da verificação de saúde usada pelo provedor. A identificação de que o pedido veio do site MUST usar um segredo que não aparece no navegador nem no repositório.
- **FR-006**: Os limites de tentativas persistidos (features 004 e 006) MUST contar pelo endereço real de quem acessa o site, e MUST NOT ser possível trocar esse endereço por um valor inventado enviado pelo próprio navegador.
- **FR-007**: O site publicado MUST pedir aos buscadores que não o indexem nem sigam seus links (constituição, princípio VIII: site privado).

**Espera do servidor**

- **FR-008**: Ao abrir o site, enquanto a API não confirma que está pronta, o site MUST mostrar a tela "Acordando o servidor" quando a espera passar de 2 s (e nunca antes, para não piscar com a API acordada), com indicador de progresso, a explicação de que pode levar até um minuto e o tempo de espera decorrido. Depois de 90 s sem resposta, a tela MUST trocar para uma mensagem de erro com "Tentar de novo", que recomeça a espera sem recarregar a página.
- **FR-009**: Quando a API ficar pronta, o site MUST seguir sozinho para a tela pedida pelo endereço original, preservando caminho e parâmetros, sem recarregar a página.
- **FR-010**: A tela de espera MUST seguir os temas claro e escuro e os requisitos de acessibilidade da feature 010: anúncio para leitor de tela, foco gerenciado na troca de tela, contraste e respeito ao movimento reduzido.
- **FR-011**: A tela de espera MUST NOT aparecer depois que uma partida foi carregada; nesse caso valem FR-032 da feature 010 e a fila de salvamento. Fora do jogo, um pedido que demore mais de 2 s durante a navegação (por exemplo, abrir a biblioteca depois de a API voltar a dormir) MUST mostrar a mesma mensagem de espera no lugar do carregamento daquela tela.

**Publicação**

- **FR-012**: A publicação MUST acontecer quando o autor aceita o pedido de lançamento (FR-022) e a verificação automática (formatação, lint, tipos, testes, build) desse aceite passa, sem outro passo manual:
  - MUST publicar só as partes cuja última versão lançada é diferente da versão que está no ar. Isso cobre a versão nova do lançamento e uma publicação anterior que tenha falhado.
  - Se a versão no ar de uma parte não puder ser identificada, essa parte MUST ser publicada.
  - Merges na `main` que não são o aceite de um pedido de lançamento MUST NOT publicar nada.
  - Uma verificação reprovada MUST NOT publicar nada.
  - O disparo manual da publicação MUST aceitar, para cada parte, uma versão lançada, "a última" (padrão) ou "a que está no ar". Toda parte com versão indicada (inclusive "a última") MUST ser publicada nessa versão, mesmo que já esteja no ar; "a que está no ar" não publica a parte. Assim, o disparo manual serve para reverter e para republicar.
- **FR-013**: A API publicada MUST aplicar as migrações pendentes antes de atender pedidos; se a migração falhar, a versão nova MUST NOT entrar no ar e a anterior MUST continuar atendendo.
- **FR-014**: Pull requests e branches que não sejam a `main` MUST NOT gerar cópias publicadas do site ligadas à API ou ao banco de produção.
- **FR-015**: Depois de cada publicação, a verificação de saúde da API publicada MUST responder com sucesso pelo endereço do site, informando a versão publicada; se não responder ou informar outra versão, o autor MUST ser avisado.
- **FR-022**: A API e o site MUST ter números de versão próprios no formato MAJOR.MINOR.PATCH (começando em 0.1.0), mantidos sozinhos a partir dos commits Conventional Commits que tocam cada parte. Contam para cada parte:
  - **API**: `apps/api/` (inclusive o `Dockerfile` e as migrações) e, como atualização de dependência (patch), `packages/shared/`. O `render.yaml` não conta, porque o provedor aplica as mudanças dele pela sincronização da própria configuração, e não pela publicação do código.
  - **Site**: `apps/web/` (inclusive a função de repasse e os arquivos públicos) e, como atualização de dependência (patch), `packages/shared/`.

  O comportamento é o seguinte:
  - **Subida**: `fix` sobe o patch, `feat` o minor e mudança incompatível o major (o minor, enquanto a parte estiver abaixo de 1.0.0). `docs`, `chore`, `ci`, `test`, `style` e `refactor` não geram versão.
  - **Pedido de lançamento**: a cada merge na `main` com mudanças que geram versão, um pedido de lançamento único MUST ser criado ou atualizado sozinho, com os números novos, a versão nos arquivos de pacote de cada parte e um registro de mudanças por parte.
  - **Aceite**: ao aceitar o pedido, cada versão nova MUST ganhar uma marcação no histórico (por exemplo `api-v0.2.0`) e uma página de lançamento no repositório com o registro de mudanças.
  - **Sem edição manual**: os números de versão e os registros de mudanças MUST NOT precisar de edição manual.
  - **Verificação no pedido**: cada atualização do pedido de lançamento MUST passar pela verificação automática, como qualquer pull request (constituição, princípio II).
- **FR-023**: A versão publicada de cada parte MUST ser consultável: a API informa a sua na verificação de saúde, e o site num arquivo público com a versão e o commit.
- **FR-024**: Uma aba aberta antes de uma publicação do site MUST continuar funcionando depois dela. Se a aba falhar ao carregar um pedaço do código do site que deixou de existir (por exemplo, ao abrir uma cruzada), o site MUST recarregar a página uma única vez, no mesmo endereço, em vez de mostrar erro. Se a falha se repetir depois de recarregar, vale a tela de erro de sempre, sem recarregar em laço.
- **FR-025**: Cada versão da API, e cada migração de banco que ela traga, MUST continuar funcionando com o site da versão anterior e com a API da versão anterior durante a troca: o site anterior fica no ar até a publicação do site terminar, e abas abertas o usam por tempo indeterminado. Remover ou renomear um campo, uma rota ou uma coluna que a versão anterior usa MUST ficar para um lançamento seguinte, depois que nenhuma versão no ar dependa mais disso.
- **FR-026**: O repositório MUST ter um documento próprio de versionamento, `docs/versionamento.md`, sem valores reais, que explique:
  - o que é a versão de cada parte e onde ela aparece (arquivo de pacote, marcação, registro de mudanças, verificação de saúde e arquivo público do site);
  - que caminhos contam para cada parte (FR-022);
  - o que cada tipo de commit faz com a versão (`fix`, `feat`, mudança incompatível, tipos que não geram versão, a regra abaixo de 1.0.0), com exemplos de mensagens e do número resultante;
  - como o pedido de lançamento se forma, como lançar (aceitá-lo) e o que acontece depois (marcações, página de lançamento, publicação só das partes com versão nova);
  - como consultar a versão no ar;
  - como reverter para uma versão anterior;
  - a regra de compatibilidade entre versões (FR-025);
  - o que não fazer (editar números ou o pedido de lançamento à mão).

  O roteiro de implantação (FR-020) MUST apontar para esse documento em vez de repetir o conteúdo. O `README.md` MUST ter um link para ele, com um resumo de 3 a 5 linhas, e o `CLAUDE.md` MUST ter o mesmo resumo com o link, nas convenções de commit.

**Dados, segredos e coleta**

- **FR-016**: Os valores reais de produção (endereço do banco, segredo do repasse, chaves dos provedores) MUST ficar só nos cofres dos provedores e da CI, nunca no repositório, em logs, specs ou no código do site (constituição, princípio VI). Variáveis novas MUST entrar no `.env.example` só com valores fictícios.
- **FR-017**: A API publicada MUST rodar em modo de produção: documentação da API desligada, seed de desenvolvimento indisponível, mensagens de erro genéricas e logs sem segredos nem dados pessoais (como nas features 004 a 009).
- **FR-018**: A coleta agendada MUST gravar no banco de produção quando o segredo do banco estiver cadastrado na CI, com aviso ao autor em caso de falha (comportamento da feature 006, agora ativo).
- **FR-019**: O autor MUST conseguir criar convites para o banco de produção com a CLI existente (feature 004), sem precisar de recurso pago do provedor da API.

**Roteiro**

- **FR-020**: O repositório MUST ter um roteiro de implantação, sem valores reais, que cubra: criação do banco, da API e do site nos provedores; variáveis e segredos de cada lugar; ligação da publicação automática; como lançar uma versão (com link para a documentação de versionamento, FR-026, sem repeti-la); criação e troca do token próprio da ferramenta de lançamento; a regra de compatibilidade entre versões (FR-025); primeiro convite; verificação pós-publicação; reversão para a versão anterior; troca de um segredo vazado; e acompanhamento do agendamento da coleta (desativação depois de 60 dias sem atividade em repositório público).
- **FR-021**: Nenhuma mudança desta feature MUST alterar o comportamento do ambiente local (`docker compose`, Vite com proxy) nem a suíte de testes, que continua sem internet (constituição, princípio VII).

### Key Entities

- **Ambiente de produção**: o conjunto site publicado + API publicada + banco de produção + coleta agendada, ligados por variáveis e segredos guardados nos provedores e na CI.
- **Segredo do repasse**: valor compartilhado só entre o site publicado e a API, que prova que um pedido passou pelo site. Não é visível no navegador nem no repositório e pode ser trocado sem mudar código.
- **Roteiro de implantação**: documento versionado com os passos para criar, publicar, verificar, reverter e manter o ambiente de produção, inclusive como lançar uma versão (aceitar o pedido de lançamento) e reverter para uma versão anterior.
- **Versão de uma parte**: número MAJOR.MINOR.PATCH da API ou do site. Está no arquivo de pacote da parte, numa marcação no histórico (`api-vX.Y.Z`, `web-vX.Y.Z`), num registro de mudanças e na versão informada pela parte publicada.
- **Pedido de lançamento**: pull request único, mantido sozinho pela CI, que propõe as próximas versões e os registros de mudanças. Aceitá-lo lança as versões e dispara a publicação.
- **Documentação de versionamento**: `docs/versionamento.md`, a referência única sobre versões, com acesso pelo link do `README.md` e resumo no `CLAUDE.md` (FR-026).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Um convidado se cadastra, joga e encontra o progresso em outro aparelho usando só o endereço público, sem ajuda do autor além do convite.
- **SC-002**: Com a API dormindo, a tela de espera aparece em até 3 s depois de abrir o site, e a tela pedida abre sozinha em até 5 s depois de a API ficar pronta, em 100% das tentativas.
- **SC-003**: Com a API acordada, a tela de login ou a biblioteca abre em até 3 s numa conexão 4G comum, sem a tela de espera aparecer.
- **SC-004**: Do aceite do pedido de lançamento à versão nova no ar passam no máximo 15 minutos, sem outro passo manual. Merges que não são aceite de lançamento não republicam nem reiniciam nenhuma parte.
- **SC-011**: Em 100% dos lançamentos, a versão informada pela API e pelo site publicados é igual à última versão lançada de cada parte, e cada versão lançada tem marcação no histórico e registro de mudanças, sem nenhuma edição manual de número de versão.
- **SC-012**: A partir do `README.md`, uma pessoa chega à documentação de versionamento com um clique. Só com ela, a pessoa acerta, para 5 mensagens de commit de exemplo, que parte ganha versão nova e qual será o número, e lança uma versão sem consultar outra fonte.
- **SC-005**: Um pedido feito direto ao endereço do provedor da API, sem passar pelo site, é recusado em 100% das tentativas (fora a verificação de saúde).
- **SC-006**: Quem estoura o limite de login por endereço (20 tentativas em 15 minutos, com e-mails diferentes) é bloqueado sem afetar outra pessoa, em outro lugar, que entra logo em seguida; mandar um endereço inventado no pedido não libera o bloqueio.
- **SC-007**: O custo mensal da implantação é zero.
- **SC-008**: Seguindo só o roteiro, o autor recria o ambiente de produção do zero em até 2 horas.
- **SC-009**: Uma busca pelo varredor de segredos (e uma revisão manual) não encontra nenhum valor real de produção no repositório, nos logs da CI ou no código do site publicado.
- **SC-010**: Em 7 dias seguidos depois da implantação, a coleta agendada grava o dia em todos eles, e o calendário publicado mostra cada dia sem busca sob demanda.

## Assumptions

- Os provedores são os da seção 9 do design (Cloudflare Pages para o site, Render no plano gratuito para a API, Neon para o banco e GitHub Actions para a coleta), confirmados na clarificação de 2026-10-15.
- Limites dos planos gratuitos consultados em 2026-10 e considerados suficientes para um grupo de amigos: Render com 750 horas de instância e 5 GB de banda de saída por mês (corte de agosto de 2026), dormindo após 15 minutos; Neon com 0,5 GB de dados e 100 horas de computação por mês, suspendendo após 5 minutos; função do Cloudflare com 100 mil pedidos por dia; GitHub Actions ilimitado (repositório público). O roteiro registra esses limites e o que acontece ao estourá-los.
- A API e o banco ficam na mesma região, na costa leste dos EUA (Render em Virgínia, Neon em `us-east-1`), a mais próxima do Brasil entre as do provedor da API. O site é servido pela rede do provedor do site, perto de quem acessa.
- O banco gratuito do próprio Render MUST NOT ser usado, porque é apagado 30 dias depois de criado; o banco fica no Neon.
- Nenhum provedor recebe cartão de crédito; se algum passar a exigir, a decisão volta ao autor antes de seguir.
- O endereço público é o subdomínio gratuito do provedor do site; domínio próprio fica fora do escopo e pode ser ligado depois sem mudar código.
- A API não é mantida acordada artificialmente (por exemplo, com pedidos periódicos); o design aceita o cold start e pede a tela de espera.
- O repasse de `/api/*` é feito por uma função do provedor do site, porque o arquivo de redirecionamentos dele não repassa para outros endereços (design, seção 9); o plano confirma isso.
- "Endereço real de quem acessa" é o informado pelo provedor do site (`CF-Connecting-IP`). O plano decidiu não contar saltos de proxy: a função de repasse envia esse endereço num cabeçalho próprio, aceito pela API só junto com o segredo do repasse, e em produção `TRUST_PROXY_HOPS` fica `0` (research R3).
- A verificação de saúde (`GET /api/health`) é a que já existe e continua sem sessão; ela é a exceção de FR-005, para o provedor da API saber se ela está no ar.
- A publicação automática pode usar a integração dos provedores com o GitHub ou um workflow da CI; o plano escolhe, desde que FR-012 e FR-014 sejam atendidos. A versão no ar de cada parte precisa ser consultável, para a comparação de FR-012 (FR-023).
- O pedido de lançamento é um pull request aberto e mantido por uma ferramenta de lançamento na CI (o plano escolhe; a candidata é a release-please). Ela usa um token próprio, e não o padrão da CI, porque os pushes feitos com o token padrão não disparam a verificação automática (FR-022, constituição, princípio II). O token é um GitHub App do autor ou um token pessoal de escopo fino, restrito a este repositório e com as permissões mínimas para criar a branch, o pull request e as marcações. Fica só nos segredos da CI (FR-016).
- As versões começam em 0.1.0 para as duas partes; a 1.0.0 é uma decisão do autor, tomada fora desta feature.
- O código compartilhado tem uma versão interna, só para propagar as mudanças: ele nunca é publicado sozinho e não tem página de lançamento. Uma versão nova dele sobe o patch da API e do site (plano, R12).
- A reversão usa os recursos de reverter versão dos próprios provedores; uma migração de banco não é desfeita automaticamente, e o roteiro explica como lidar com isso.
- O backup do banco é o que o plano gratuito do provedor oferece; o roteiro registra o limite.
- O primeiro convite é criado rodando a CLI da máquina do autor com o endereço do banco de produção, porque o terminal remoto do provedor da API é pago.
- Os limites de 2 s (mostrar a espera) e 90 s (desistir) são valores iniciais; o plano pode ajustá-los se SC-002 for atendido.
- A tela de espera é a mesma no celular e no computador.

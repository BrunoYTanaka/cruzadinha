# Contrato: rotas, tema e acessibilidade do site

**Feature**: [spec.md](../spec.md) | **Modelo**: [data-model.md](../data-model.md) | **Referências visuais**: `docs/mockups/`

## Rotas do site

| Caminho | Tela | Acesso | Observação |
|---|---|---|---|
| `/login` | Entrar | público | com sessão válida redireciona à biblioteca |
| `/cadastro` | Criar conta (convite) | público | idem |
| `/` | Biblioteca (calendário) | sessão | |
| `/dia/:date` | Busca de um dia passado | sessão | `date` em `AAAA-MM-DD`; redireciona a `/jogo/:id` ou mostra o motivo |
| `/jogo/:puzzleId` | Jogo | sessão | carregado sob demanda; abre em modo leitura se concluída |
| `/status` | Estado do servidor e do banco | público | página de status da feature 002, mantida |
| qualquer outro | Página não encontrada | público | com link para a biblioteca |

Sem sessão, toda rota protegida redireciona a `/login` levando o endereço de origem na query `?next=`; depois do login o site volta a ele. **Exceção no jogo**: se a sessão expirar com o tabuleiro aberto, o site não redireciona; mantém o jogo, mostra um aviso e abre o login numa janela por cima (FR-032). O cabeçalho aparece em todas as telas logadas (nome, data quando faz sentido, botão de tema, "Sair"); login e cadastro mostram só o nome.

## Variáveis de ambiente do front (`VITE_*`)

| Variável | Padrão | Regra |
|---|---|---|
| `VITE_HELP_LETTER_LIMIT` | `4` | inteiro de 0 a 99; inválido aborta a inicialização com mensagem clara |
| `VITE_HELP_WORD_LIMIT` | `2` | idem |

Entram no build (ver `research.md` R7). Só variáveis com prefixo `VITE_` chegam ao navegador; nenhuma carrega segredo.

## Chaves de armazenamento

Definidas em `data-model.md`, seção 2. Toda leitura e escrita tolera falha; o site funciona sem armazenamento.

## Tema

- Modos: `auto` (padrão), `light`, `dark`. Atributo `data-theme="light|dark"` na raiz quando há escolha; sem atributo, `prefers-color-scheme` decide.
- Um script inline em `index.html` aplica o atributo antes da primeira pintura.
- O botão de tema alterna `auto → claro → escuro → auto` e mostra o modo atual por texto ("Tema: Auto").

### Tokens obrigatórios (nomes estáveis; valores nos arquivos de tema)

| Grupo | Tokens |
|---|---|
| Superfícies e texto | `--bg`, `--surface`, `--ink`, `--mute`, `--line` |
| Ação | `--accent`, `--accent-ink`, `--focus` |
| Tabuleiro | `--block`, `--cell`, `--cell-line`, `--word`, `--sel`, `--sel-ink` |
| Ajuda | `--help` (roxo), `--bad` (vermelho) |
| Estado | `--ok`, `--ok-tint`, `--warn`, `--warn-tint` |
| Controles | `--pill` |

Componentes não têm cores nem medidas fixas: só leem tokens. O tema escuro redefine os mesmos nomes.

### Pares com contraste mínimo verificados por teste (nos dois temas)

| Par | Mínimo |
|---|---|
| `--ink` sobre `--bg`, `--surface`, `--cell`, `--word`, `--pill` | 4,5:1 |
| `--mute` sobre `--bg` e `--surface` | 4,5:1 |
| `--sel-ink` sobre `--sel` | 4,5:1 |
| `--accent-ink` sobre `--accent` | 4,5:1 |
| `--ok` sobre `--ok-tint`; `--warn` sobre `--warn-tint` | 4,5:1 |
| `--sel` contra `--cell`; `--sel` contra `--word`; `--word` contra `--cell`; `--block` contra `--cell`; `--cell-line` contra `--cell` | **sem mínimo** (exceção assumida pelo autor, ver abaixo); o teste só registra os valores |
| `--help` e `--bad` contra `--cell` | 3:1 |
| `--focus` contra `--bg` | 3:1 |

### Medição da paleta dos mockups (2026-10-14)

Texto passa em todos os pares (de 4,98:1 a 16,5:1). Os estados do tabuleiro, não:

| Par | Claro | Escuro | Exigido |
|---|---|---|---|
| selecionada contra célula vazia | 1,44 | 8,04 | 3 |
| palavra ativa contra célula vazia | 1,33 | 1,44 | 3 |
| selecionada contra palavra ativa | 1,08 | 5,59 | 3 |
| bloco contra célula vazia | 15,78 | 1,36 | 3 |
| borda da célula contra célula vazia | 2,09 | 1,97 | 3 |
| `--help` contra célula vazia | 6,42 | 7,73 | 3 |
| `--bad` contra célula vazia | 4,98 | 5,32 | 3 |

**Decisão do autor (2026-10-14)**: a paleta dos mockups fica como está, com a célula selecionada diferindo só pela cor de fundo (sem contorno nem borda extra). Os pares de estado do tabuleiro entre si não têm mínimo de 3:1; o teste de contraste exige 4,5:1 para texto e a letra de cada estado, e 3:1 para controles, foco e marcas de ajuda, e apenas registra os valores medidos dos pares de estado, com uma lista explícita de exceções no próprio teste. A auditoria `axe` do navegador desliga a regra de contraste só para essas células do tabuleiro, nunca para o resto da tela.

## Acessibilidade (nível "básico sólido")

- **Teclado**: toda ação alcançável; tabuleiro com uma parada de tabulação e foco móvel; `Esc` fecha diálogos e a legenda; foco sempre visível (`:focus-visible` com `--focus`).
- **Leitor de tela**: tabuleiro `role="grid"`; cada célula com `aria-label` (linha, coluna, letra ou vazia, e "com ajuda" ou "errada na verificação"); região `aria-live="polite"` para dica ativa, resultado das ajudas e conclusão; botões de ajuda esgotados com `aria-disabled` e motivo no rótulo.
- **Diálogos** (conclusão e convite): `role="dialog"`, `aria-modal="true"`, título e descrição referenciados, foco inicial no botão principal, `Esc` fecha, foco volta ao elemento de origem.
- **Formulários**: rótulo visível ligado ao campo, erro em região `role="alert"`, `autocomplete` correto (`username`, `current-password`, `new-password`).
- **Estado do salvamento** (`SaveStatus`): texto visível ("Salvando…", "Salvo", "Sem conexão, tentando de novo") sem região viva; só a queda para sem conexão e a volta são anunciadas, por uma região `aria-live="polite"` oculta.
- **Avisos que não bloqueiam** (`Notice`): região `aria-live="polite"` (`role="alert"` só para erro), fora do tabuleiro, sem tomar o foco nem cobrir o jogo; usados para rede, salvamento, sessão expirada e conclusão em outro aparelho.
- **Cor nunca sozinha**: estados da biblioteca e da ajuda trazem texto ou forma além da cor.
- **Movimento**: `prefers-reduced-motion` desliga animações e transições.
- **Toque**: alvos de 44 px fora do tabuleiro; células do tabuleiro de 30 px no celular são exceção assumida (seleção também por dicas, setas e barra da palavra ativa).
- **Idioma**: `lang="pt-BR"` na raiz.

## Superfícies de interface (resumo por tela)

| Tela | Elementos obrigatórios |
|---|---|
| Login e cadastro | rótulos, campos, mensagem genérica, link entre as duas, tempo de espera quando houver limite |
| Biblioteca | título "Escolha um dia", botão "Jogar a de hoje", calendário com navegação de mês, legenda dos estados |
| Jogo | cabeçalho, faixa de ferramentas (tempo, pausa, outro dia, estado do salvamento, ajudas com contadores), dica ativa, tabuleiro, lista de dicas (computador) ou barra da palavra ativa, teclado e folha de dicas pela tecla "Dicas" (celular), botão "?" da legenda, atribuição à fonte, avisos que não bloqueiam |
| Sessão expirada (no jogo) | aviso "Sua sessão expirou. Entre de novo para salvar" e janela de login com o e-mail da conta da partida somente leitura, senha, "Entrar"; fecha com `Esc` sem perder o jogo |
| Conclusão | título, tempo, melhor tempo ("—" com o aviso "Vamos registrar quando a conexão voltar" enquanto não confirmado), ajudas usadas, "Voltar à biblioteca", "Ver o tabuleiro" |
| Modo leitura | faixa "Concluída em mm:ss", tabuleiro sem seleção, "Jogar de novo", "Voltar à biblioteca" |
| Convite | código uma vez com "Copiar", validade, contagem de ativos, "Pronto"; versão de cota cheia com "Entendi" |

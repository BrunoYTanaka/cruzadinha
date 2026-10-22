# Research: Templates de issues

Fonte: documentação do GitHub (`/github/docs` no Context7), consultada em 2026-10-22.

## 1. Formulário de issue (YAML) em vez de template Markdown

- **Decision**: usar formulários (`.yml`) em `.github/ISSUE_TEMPLATE/`.
- **Rationale**: só eles têm campos obrigatórios (`validations.required`), listas e caixas de texto separadas, que a issue #43 e FR-006 pedem. O corpo da issue sai com um título `###` por campo, previsível para quem lê.
- **Alternatives**: template Markdown (`.md`): sem obrigatoriedade, o texto pré-preenchido é apagado ou esquecido. Rejeitado.

## 2. Chaves usadas

- Topo: `name`, `description`, `title`, `labels`, `body` (todas confirmadas; `name` e `description` são obrigatórias e `name` deve ser único).
- Campos: `textarea`, `input`, `dropdown`, `markdown` (texto de ajuda, não é enviado); `validations.required: true` marca obrigatório; `attributes.label`/`description`/`placeholder` dão rótulo e instrução curta.
- **Decision**: critérios de aceitação em `textarea` com `value` pré-preenchido `- [ ] ` (lista marcável, FR-009).
- **Decision**: evidências e logs em `textarea` **sem** `render`, porque com `render` o campo deixa de aceitar anexo de imagem. A instrução manda envolver logs em blocos de código.
- `type`/`projects`/`assignees` não são usados.

## 3. Etiquetas

- O GitHub só aplica etiquetas que já existem. Existem `bug`, `enhancement` e `documentation`; `chore` não existe.
- **Decision**: bug → `bug`, feature → `enhancement`, docs → `documentation`, chore → nenhuma. Não criar etiqueta (fora do escopo, ação no repositório remoto).

## 4. Seletor de tipos (`config.yml`)

- Só tem duas chaves: `blank_issues_enabled` e `contact_links`. O seletor mostra o `name` e a `description` de cada formulário.
- **Decision**: `blank_issues_enabled: true`, sem `contact_links` (spec, Assumptions). Com `false`, só quem tem permissão de escrita ainda vê a opção (como "Maintainers only"); manter `true` deixa a issue em branco aberta a perguntas soltas que não cabem nos quatro tipos.
- A ordem no seletor segue o nome do arquivo e o GitHub não oferece outra ordenação. **Decision**: aceitar a ordem alfabética (bug, chore, docs, feature); a spec não exige ordem (FR-010 só pede a lista).

## 5. Ambiente/versão do bug

- **Decision**: `input` de linha única opcional com dica: versão do site (`/version.json`) e da API (`/api/health`), navegador e sistema, e se o problema ocorre como visitante ou logado. Texto livre, para aceitar bugs de CI/deploy (edge case da spec).

## 6. Segurança

- **Decision**: um bloco `markdown` curto no topo do formulário de bug (onde se cola log) lembra de não colar senhas, cookies, `.env` nem dados pessoais (constituição VI). Os outros formulários não precisam do aviso.

## 7. Validação sem rodar no GitHub

- O GitHub só renderiza o seletor a partir da branch padrão. Antes do merge, validar: YAML válido (parse), chaves obrigatórias presentes, `format:check`. Depois do merge, conferir manualmente (quickstart).

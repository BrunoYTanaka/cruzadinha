# Contrato: formulários de issue

Interface exposta ao usuário: a página de nova issue. Legenda: **obrigatório** = `required: true`.

## Seletor (`config.yml`)

`blank_issues_enabled: true`; sem `contact_links`.

## `bug.yml` — nome "Bug", título `fix: `, etiqueta `bug`

Descrição do seletor: "Algo não funciona como deveria."

| id | tipo | rótulo | obrigatório |
| --- | --- | --- | --- |
| (aviso) | markdown | lembrete: sem segredos, cookies, `.env` nem dados pessoais | n/a |
| descricao | textarea | Descrição do problema | sim |
| passos | textarea (valor inicial `1.`, `2.`, `3.`) | Passos para reproduzir | sim |
| esperado | textarea | Comportamento esperado | sim |
| atual | textarea | Comportamento atual | sim |
| ambiente | input | Ambiente e versão | não |
| evidencias | textarea | Evidências (prints, logs) | não |

## `feature.yml` — nome "Feature / melhoria", título `feat: `, etiqueta `enhancement`

Descrição: "Propor uma funcionalidade nova ou uma melhoria."

| id | tipo | rótulo | obrigatório |
| --- | --- | --- | --- |
| contexto | textarea | Contexto do problema | sim |
| objetivo | textarea | Objetivo da funcionalidade | sim |
| criterios | textarea (valor inicial `- [ ] `) | Critérios de aceitação | sim |
| impactos | textarea | Impactos esperados | não |

## `docs.yml` — nome "Documentação", título `docs: `, etiqueta `documentation`

Descrição: "Criar, corrigir ou atualizar documentação."

| id | tipo | rótulo | obrigatório |
| --- | --- | --- | --- |
| area | input | Documento ou área afetada | sim |
| objetivo | textarea | Objetivo da atualização | sim |
| publico | input | Público-alvo | não |
| validacao | textarea | Validação e revisão esperadas | não |

## `chore.yml` — nome "Manutenção / chore", título `chore: `, sem etiqueta

Descrição: "Dependências, CI, ferramentas ou limpeza que não mudam o comportamento."

| id | tipo | rótulo | obrigatório |
| --- | --- | --- | --- |
| objetivo | textarea | Objetivo da tarefa | sim |
| impacto | textarea | Impacto no projeto | não |
| riscos | textarea | Riscos e validação | não |

Todas as instruções (`description`) dos campos são curtas e em português do Brasil. Nenhum tipo passa de 4 campos obrigatórios (SC-004).

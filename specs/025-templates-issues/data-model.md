# Data Model: Templates de issues

Não há dados persistidos. As entidades da spec viram a estrutura dos arquivos.

## Template de issue (um arquivo `.yml`)

| Atributo | Regra |
| --- | --- |
| `name` | único entre os templates; é o nome no seletor |
| `description` | uma linha, aparece no seletor |
| `title` | prefixo `[Bug]: `, `[Feature]: `, `[Docs]: ` ou `[Chore]: ` |
| `labels` | etiqueta existente no repositório; vazio para chore |
| `body` | lista ordenada de campos |

## Campo

| Atributo | Regra |
| --- | --- |
| `type` | `textarea`, `input`, `dropdown` ou `markdown` |
| `id` | único dentro do template, em minúsculas com hífen |
| `attributes.label` | obrigatório; rótulo curto |
| `attributes.description` | instrução de uma ou duas frases |
| `validations.required` | `true` só para os campos obrigatórios da tabela do FR-006 |

Os campos de cada template estão em [contracts/issue-forms.md](contracts/issue-forms.md).

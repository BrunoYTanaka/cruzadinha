# Data Model: Verificação automática opcional

## Configuração `verifyOnType`

| Campo | Tipo | Padrão | Regras |
|-------|------|--------|--------|
| `verifyOnType` | booleano | `false` | Em `settingsSchema` (`packages/shared/src/settings/schema.ts`). Leitura campo a campo: valor ausente ou inválido vale o padrão, sem derrubar os outros campos. Opcional no pedido `PUT /api/settings` (site anterior não o envia). Chave desconhecida é descartada pelo site anterior |

Onde vive: no aparelho (`cruzadinha:settings`) e, para quem tem conta, em `user_settings.settings` (`jsonb`). Regras existentes: o `savedAt` mais novo vence; ao entrar, a conta vence. **Sem tabela, coluna ou migração.**

Documentação: DDE-004 ganha `verifyOnType` (booleano, padrão falso, pode faltar em pedidos de um site anterior) na linha de `settings`; o ERD-004 só muda se citar o conteúdo do documento.

## Marca de erro automática (derivada, não persistida)

- Entrada: `GameState` (`cells`, `locked`, `marks`) e `Solution`.
- Regra: para cada casa com solução, `cells[r][c] != null`, `!locked[r][c]` e `plainLetter(esperada) !== cells[r][c]` ⇒ marca `wrong` na chave `"linha,coluna"`.
- Casa vazia, travada (revelada) ou só com rascunho: sem marca automática. O rascunho vive em `draft`, fora de `cells`.
- Saída: cópia de `marks` com as marcas automáticas somadas (`wrong` vence qualquer outra marca da mesma casa). Usada só para desenhar; `state.marks`, o snapshot de ajudas e a conclusão não a veem.
- Transições: ligar a opção ⇒ nova derivação com as letras já escritas; desligar ⇒ volta a `state.marks`; digitar ou apagar ⇒ `cells` muda e a derivação recalcula.

## Estado do menu (só interface)

`aberto` (booleano local de `Menu`) e o item com foco. Não é gravado.

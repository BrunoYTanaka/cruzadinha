# Contrato de interface

O contrato é [design-system.html](../design-system.html) (versão `1793797223-ba76`, sha256 no brief). Nenhum endpoint muda.

Componentes e props públicas após a feature:

- `Button`: `variant` `primary | secondary | quiet | icon`, `size?: 'small'`, `block?`, `pending?` (sem mudança).
- `Link` (novo): props de `<a>`/`Link` do router; `className` aceito.
- `Notice`: `variant` `info | warning | error | ok`.
- `Dialog`: botão de fechar em ícone no canto superior direito, `--tap`.
- Ordenação: alça com `aria-label="Arrastar <fonte>"` e `aria-describedby` apontando a um texto fixo com as instruções.

Landing e tabuleiro: sem alteração (regressão coberta pelos testes existentes).

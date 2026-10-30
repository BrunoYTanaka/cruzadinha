# Research: Imprimir a cruzada

## Decisão 1: PDF direto?
- **Decision**: não. Só impressão; "Salvar como PDF" fica na janela do navegador.
- **Rationale**: mesma folha serve a papel e PDF, sem dependência (jsPDF/pdf-lib pesariam no pacote) e sem o site gerar um arquivo do conteúdo da fonte. A impressão em si ainda exige a emenda 6.0.0 da constituição VIII (T001).
- **Alternatives**: gerar PDF no cliente (peso, fontes, layout próprio duplicado); PDF no servidor (viola VIII e privacidade).

## Decisão 2: de onde vem a folha
- **Decision**: componente próprio `PrintSheet` que recebe só o `Puzzle` público.
- **Rationale**: o `Board` carrega letras, rascunho, marcas e seleção; esconder por CSS é frágil (texto oculto ainda existe no DOM e na impressão por leitor de tela). Com marcação própria a ausência de letras é estrutural (FR-004) e testável.
- **Alternatives**: `@media print` sobre o `Board` (risco de vazar letra digitada, depende de estado); janela nova com HTML próprio (popup bloqueado, perde Ctrl+P).

## Decisão 3: como ocultar o resto da página
- **Decision**: em `print`, `body > :not(.sheet) { display: none }` e a folha em portal direto no `body`.
- **Rationale**: cobre portais (diálogos, tooltips, avisos) sem lista de classes; Ctrl+P sem o botão (FR-006) funciona porque é só CSS.
- **Alternatives**: classe no `body` ligada em `beforeprint` (não cobre todos os caminhos e precisa de JS); `display:none` em cada região (esquece portais novos).

## Decisão 4: bloqueios sem cor de fundo
- **Decision**: `<svg>` com `rect` preenchido em cada bloqueio, mais `print-color-adjust: exact` por garantia.
- **Rationale**: navegadores não imprimem `background` por padrão; preenchimento de SVG imprime (FR-007).
- **Alternatives**: só `background: #000` (some sem a opção ligada); borda grossa (confunde com casa aberta).

## Decisão 5: tamanho e quebra
- **Decision**: casa de até 10 mm, grade limitada à largura útil; dicas em 2 colunas com `break-inside: avoid`; A4 e carta por `@page { size: auto }`.
- **Rationale**: 30 colunas em ~186 mm dão ≥ 6 mm, legível a lápis; sem tamanho de papel fixo, o navegador escolhe A4 ou carta.
- **Alternatives**: `@page size: A4` (ruim para carta).

## Decisão 6: relógio e progresso
- **Decision**: nada a pausar.
- **Rationale**: o relógio usa marcas de tempo, então o bloqueio de `print()` não soma tempo; nenhuma ação é despachada (FR-009). Verificar no teste de unidade que `print` não dispara ação.

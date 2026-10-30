# Research: Compartilhar o resultado sem spoiler

- **Decisão**: copiar primeiro com `navigator.clipboard.writeText`; se falhar, `navigator.share`; se faltar também, texto selecionável. **Motivo**: copiar é o pedido da issue e um toque; o compartilhamento resolve celulares sem permissão de cópia; o texto à mão garante SC-004. **Alternativas**: só Web Share (abre a folha do sistema mesmo no desktop, mais passos); `document.execCommand('copy')` (obsoleto).
- **Decisão**: só texto, sem imagem. **Motivo**: a issue diz "talvez imagem"; imagem exigiria desenhar a grade, e a forma da grade é o que o texto evita revelar. **Alternativa**: imagem com a grade vazia, adiada.
- **Decisão**: texto de duas linhas, sem ajudas e sem link. **Motivo**: a issue pede fonte, data e tempo. **Alternativa**: incluir ajudas, fácil de somar depois.
- **Decisão**: data `dd/mm/aaaa` da cruzada. **Motivo**: `formatDate` do jogo omite o ano e fica ambíguo em cruzadas antigas.
- **Decisão**: aviso dentro do diálogo. **Motivo**: o diálogo modal cobre o `CopyToast` da tela.
- **Decisão**: o `shareText` é montado em `GameScreen` e passado ao diálogo. **Motivo**: o diálogo já recebe só valores prontos; `puzzle.source` e `puzzle.date` já existem lá.
- **Decisão** (atualiza a de "só texto"): a imagem é um cartão de texto estilizado, desenhado num `canvas` no aparelho. **Motivo**: pedido da issue; sem grade o cartão não revela forma nem resposta; sem biblioteca nova. **Alternativas**: grade de quadradinhos estilo Wordle (mostra o padrão de blocos), SVG/`html-to-image` (dependência nova).
- **Decisão**: entrega por `navigator.share({ files })`, depois `ClipboardItem`, depois download. **Motivo**: celular compartilha o arquivo direto; computador copia ou baixa.

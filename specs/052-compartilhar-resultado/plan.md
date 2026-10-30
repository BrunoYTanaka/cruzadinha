# Implementation Plan: Compartilhar o resultado sem spoiler

**Branch**: `feat/052-compartilhar-resultado` | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/052-compartilhar-resultado/spec.md`

## Summary

Só o site muda. O diálogo ganha também "Compartilhar imagem": um cartão PNG desenhado num `canvas` no aparelho (marca, fonte, data, tempo), entregue por compartilhamento de arquivo, cópia de imagem ou download. O diálogo de conclusão ganha o botão "Compartilhar resultado". Uma função pura monta o texto (fonte, data, tempo); um hook tenta copiar para a área de transferência, cai para o compartilhamento do aparelho e, por último, mostra o texto selecionável. Nada vai ao servidor; API, contratos e dados não mudam.

## Technical Context

**Language/Version**: TypeScript 6 estrito, React 19, Vite 8

**Primary Dependencies**: as que já existem; nenhuma nova. Clipboard e Web Share são APIs do navegador, não bibliotecas (sem consulta ao Context7).

**Storage**: N/A (o texto é montado a cada toque, não é guardado)

**Testing**: Vitest + Testing Library + `vitest-axe`; `navigator.clipboard` e `navigator.share` simulados nos testes

**Target Platform**: navegador (site), inclusive celular e uso sem rede

**Project Type**: web (`apps/web`)

**Performance Goals**: N/A

**Constraints**: o texto nunca leva letra, dica ou forma da grade; o foco inicial e a ordem dos botões atuais do diálogo não mudam; sem rede ou conta o botão funciona

**Scale/Scope**: 1 diálogo, 2 helpers (texto e cartão), 1 hook, 1 componente

## Constitution Check

_GATE: passa antes e depois do desenho._

- I. TypeScript estrito: sem `any`; `navigator.share` testado por presença. Passa.
- II. Qualidade automatizada: testes do helper, do hook e do diálogo, lint, `typecheck`, `check:deps`. Passa.
- III, IV, IX: sem mudança no back, nas fontes nem no schema. N/A.
- V. Lógica pura: o texto sai de função pura sem React, em `features/game/helpers`. `domain/game` não é tocado. Passa.
- VI. Privacidade: o texto não leva dado da pessoa e nada é enviado. Passa.
- VII. Testes determinísticos: APIs do navegador simuladas, sem rede. Passa.
- VIII. Conteúdo de terceiros: leva só o nome da fonte (atribuição), nunca conteúdo da cruzada. Passa.
- Fluxo: comportamento novo, ciclo completo em `feat/052-...`.

## Project Structure

### Documentation (this feature)

```text
specs/052-compartilhar-resultado/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md             # /speckit-tasks
```

Sem `contracts/`: nenhuma interface externa muda.

### Source Code (repository root)

```text
apps/web/src/features/game/
├── helpers/share-result.ts (+ .test.ts)          # buildShareText, função pura
├── helpers/share-card.ts (+ .test.ts)            # renderShareCard: desenha o PNG num canvas
├── hooks/useShareResult.ts (+ .test.ts)          # copiar → compartilhar → texto à mão
└── components/dialogs/
    ├── CompletionDialog/CompletionDialog.tsx     # botão e aviso; recebe shareText
    └── CompletionDialog/CompletionDialog.test.tsx
apps/web/src/features/game/components/GameScreen/GameScreen.tsx   # monta shareText com puzzle.source/date e finishedMs
```

**Structure Decision**: tudo dentro de `features/game`, sem novo import entre features nem barrel novo (`index.ts` não muda). `formatElapsed` vem de `shared/helpers/time`. Os nomes das fontes vêm de `puzzleSourceNames` em `@cruzadinha/shared`.

## Design

- **Texto** (duas linhas, português):
  `Cruzadinha · <Fonte> · <dd/mm/aaaa>` e `Concluí em <mm:ss>`. A data é a da cruzada, formatada a partir do ISO sem fuso. Entram só `source`, `date` e `elapsedMs`; por construção nada da solução chega à função.
- **Fluxo do toque**: `navigator.clipboard.writeText` → ok: aviso "Resultado copiado". Falhou ou ausente → se `navigator.share` existe, chama; `AbortError` (cancelou) é silencioso; qualquer outra falha ou ausência → mostra o texto num campo somente leitura, selecionado, com o aviso "Não foi possível copiar sozinho. Copie o texto abaixo."
- **Aviso**: parágrafo `role="status"` dentro do diálogo (o diálogo é modal e cobre o `CopyToast`).
- **Botão**: `Button` variante `secondary`, `block`, no fim da lista de ações, para não mexer na ordem nem no foco inicial.

- **Imagem**: `renderShareCard({ source, date, elapsedMs })` desenha num `canvas` 1080×1080 com cores fixas (cartão próprio, igual em tema claro e escuro) e devolve um `Blob` PNG (ou `null` se o canvas não existir). Recebe os mesmos três valores do texto. Entrega: `navigator.canShare({ files })` → `navigator.share({ files, text })`; senão `navigator.clipboard.write([new ClipboardItem(...)])`; senão download por `<a download>`. Estados novos do hook: `imageCopied`, `imageDownloaded` (compartilhada não mostra aviso, como `shared`).

## Complexity Tracking

Sem violações.

## Ajuste: um botão, segunda tela

O diálogo tem um só botão "Compartilhar" (ícone de compartilhar). Ele troca o conteúdo da mesma `Dialog` (sem segunda janela, para não duplicar a captura de foco) por "Compartilhar texto", "Compartilhar imagem" (cada um com ícone), os avisos e "Voltar". `Esc` volta ao resultado; o foco vai ao primeiro botão ao entrar e ao "Compartilhar" ao voltar. O hook ganhou `reset` para limpar o aviso ao trocar de tela.

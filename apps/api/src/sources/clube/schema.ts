import { z } from 'zod'

// Documento lido do XML do Cruzadas Clube (Crossword Compiler "applet"). Os atributos chegam como
// texto; o que o jogo não usa (cores, tamanhos, `grid-look`, `applet-settings`) é descartado.
const positiveInt = z
  .string()
  .regex(/^[1-9]\d*$/, { error: 'deve ser um inteiro positivo' })
  .transform(Number)

// Coordenada de palavra: um número ("3") ou um intervalo ("1-10").
const span = z.string().regex(/^\d+(-\d+)?$/, { error: 'deve ser N ou N-M' })

const cellSchema = z.object({
  x: positiveInt,
  y: positiveInt,
  type: z.string().optional(),
  solution: z.string().optional(),
  // Barra no lado esquerdo / de cima da célula: o limite entre duas palavras vizinhas.
  'left-bar': z.string().optional(),
  'top-bar': z.string().optional(),
})

const wordSchema = z.object({
  id: z.string().min(1),
  x: span,
  y: span,
})

// As dicas chegam cruas (nó de parada do leitor). O número vem vazio nesta fonte: a numeração é
// derivada pela ordem de leitura.
const clueSchema = z.object({
  '#text': z.string().optional(),
  word: z.string().min(1),
})

const rawText = z.string().optional()

export const clubeDocSchema = z.object({
  'crossword-compiler-applet': z.object({
    'rectangular-puzzle': z.object({
      metadata: z.object({ title: rawText, creator: rawText, copyright: rawText }).optional(),
      crossword: z.object({
        grid: z.object({
          width: positiveInt,
          height: positiveInt,
          cell: z.array(cellSchema),
        }),
        word: z.array(wordSchema),
        clues: z.array(z.object({ clue: z.array(clueSchema).optional() })),
      }),
    }),
  }),
})

export type ClubeDoc = z.infer<typeof clubeDocSchema>

import { z } from 'zod'

// Documento lido do XML do Crossword Compiler (data-model §3). Os atributos chegam como texto; os
// que o jogo não usa (`hint-url`, `grid-look`, `xmlns`, `alphabet`) são descartados.
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
  number: positiveInt.optional(),
})

const wordSchema = z.object({
  id: z.string().min(1),
  x: span,
  y: span,
  // Palavra em mais de um trecho: existe no formato, mas o jogo não suporta.
  cells: z.unknown().optional(),
})

const clueSchema = z.object({
  '#text': z.string().optional(),
  word: z.string().min(1),
  number: positiveInt,
  format: z.string().optional(),
})

// Metadados e dicas chegam crus (nós de parada do leitor): texto, possivelmente vazio.
const rawText = z.string().optional()

export const crosswordCompilerSchema = z.object({
  'crossword-compiler': z.object({
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

export type CrosswordCompilerDoc = z.infer<typeof crosswordCompilerSchema>

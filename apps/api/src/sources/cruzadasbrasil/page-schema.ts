import { z } from 'zod'

const positiveInt = z.number().int().positive()
const dimension = z.number().int().min(1).max(30)

const clueList = z.array(z.object({ numero: positiveInt, dica: z.string() }))

// Dados do jogo embutidos na página (research R2). Objetos tolerantes: a fonte pode acrescentar
// campos sem aviso, e só os usados aqui são conferidos.
export const gameDataSchema = z.object({
  id: z.string(),
  titulo: z.string().optional(),
  nivel: z.string(),
  dimensoes: z.object({ linhas: dimension, colunas: dimension }),
  dicas: z.object({ horizontais: clueList, verticais: clueList }),
  posicoes_num: z.array(
    z.object({
      numero: positiveInt,
      x: z.number().int().min(0),
      y: z.number().int().min(0),
    }),
  ),
  gabarito: z.array(z.array(z.string())),
})

export type GameData = z.infer<typeof gameDataSchema>

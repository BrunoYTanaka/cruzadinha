import { puzzleSourceNames, type PuzzleSourceId } from '@cruzadinha/shared'
import { formatElapsed } from '../../../shared/helpers/time/time'

const SIZE = 1080
// Cartão com cores próprias: sai igual em tema claro e escuro.
const PAPER = '#fffdf7'
const INK = '#1f2430'
const MUTE = '#5b6270'
const ACCENT = '#f5c518'

// Desenha o cartão do resultado (feature 052). Recebe os mesmos três valores do texto, então nada
// da solução, das dicas ou da grade chega aqui. `null` quando o navegador não tem canvas.
export function renderShareCard(result: {
  source: PuzzleSourceId
  date: string
  elapsedMs: number
}): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)
  const [year, month, day] = result.date.split('-')

  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.fillStyle = ACCENT
  ctx.fillRect(0, 0, SIZE, 28)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.fillStyle = INK
  ctx.font = '700 120px Fraunces, Georgia, serif'
  ctx.fillText('Cruzadinha', SIZE / 2, 230, SIZE - 120)
  ctx.fillStyle = MUTE
  ctx.font = '500 52px Roboto, Arial, sans-serif'
  ctx.fillText(puzzleSourceNames[result.source], SIZE / 2, 380, SIZE - 120)
  ctx.fillText(`${day}/${month}/${year}`, SIZE / 2, 450, SIZE - 120)

  ctx.fillStyle = INK
  ctx.font = '700 230px "Roboto Mono", monospace'
  ctx.fillText(formatElapsed(result.elapsedMs), SIZE / 2, 700, SIZE - 120)
  ctx.fillStyle = MUTE
  ctx.font = '500 48px Roboto, Arial, sans-serif'
  ctx.fillText('Concluí em', SIZE / 2, 580, SIZE - 120)

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'))
}

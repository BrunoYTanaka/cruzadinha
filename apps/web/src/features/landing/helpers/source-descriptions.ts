import type { PuzzleSourceId } from '@cruzadinha/shared'

// Descrição de cada fonte na landing (feature 048), escrita à mão: quem publica e o tipo de cruzada.
// O Record por id faz o typecheck falhar quando uma fonte entra no jogo sem descrição aqui. Nada de
// dicas, grades ou marcas das fontes: o conteúdo pertence a elas (constitution VIII).
export const SOURCE_DESCRIPTIONS: Record<PuzzleSourceId, string> = {
  oglobo: 'A cruzada diária do jornal O Globo, do Rio de Janeiro.',
  cruzadaonline: 'A cruzada publicada pelo jornal Público, de Portugal, em português europeu.',
  cruzadasbrasil: 'As cruzadas diárias do site Cruzadas Brasil.',
  clube: 'As edições do Cruzadas Clube, disponíveis a partir dos dias que o Cruzadinha já guardou.',
}

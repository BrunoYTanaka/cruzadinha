// Textos fixos das telas de espera (feature 059). O título é o que a pessoa lê; a palavra aparece
// nas casas de cruzada, só como decoração.
export type LoadingScreen = 'entry' | 'game' | 'day' | 'library' | 'stats'

export const LOADING_SCREENS: Record<LoadingScreen, { title: string; word: string }> = {
  entry: { title: 'Preparando as palavras…', word: 'CRUZADA' },
  game: { title: 'Montando a grade…', word: 'GRADE' },
  day: { title: 'Procurando a cruzada de hoje…', word: 'BUSCANDO' },
  library: { title: 'Folheando o calendário…', word: 'CALENDÁRIO' },
  stats: { title: 'Contando seus acertos…', word: 'ACERTOS' },
}

// Explicação da demora, a mesma na tela de espera, nos botões da landing e nos formulários.
export const SLOW_MESSAGE =
  'O servidor tirou uma soneca. Já estamos acordando ele, pode levar até um minuto.'

import { replace } from 'react-router'
import { loadSourceChoice } from '../../features/library'
import { todayInBrasilia } from '../../shared/helpers/dates/dates'

// "Jogar a cruzada de hoje" da landing (feature 048): endereço estável (a data de hoje não pode ficar
// escrita no HTML pré-gerado) que leva ao dia de hoje da cruzada padrão, como o cartão de "Hoje".
export function playTodayLoader({ today = todayInBrasilia }: { today?: () => string } = {}) {
  return () => replace(`/dia/${today()}?fonte=${loadSourceChoice()}`)
}

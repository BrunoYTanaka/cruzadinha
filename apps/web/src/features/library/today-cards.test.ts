import { describe, expect, it } from 'vitest'
import { makeLibraryItem } from '../../test/fixtures'
import { todayCard } from './today-cards'

const today = '2026-10-19'
const fresh = { down: false, noPuzzle: false }

describe('todayCard', () => {
  it('não iniciada: "Jogar", abre o jogo guardado', () => {
    const item = makeLibraryItem(today)
    expect(todayCard('oglobo', [item], today, fresh)).toEqual({
      source: 'oglobo',
      name: 'O Globo',
      kind: 'not_started',
      status: 'Não iniciada',
      spoken: 'não iniciada',
      action: 'Jogar',
      href: `/jogo/${item.puzzleId}`,
    })
  })

  it('em andamento: tempo corrido e "Continuar"; sem tempo, só o estado', () => {
    const playing = makeLibraryItem(today, { status: 'in_progress', elapsedMs: 522_000 })
    expect(todayCard('oglobo', [playing], today, fresh)).toMatchObject({
      kind: 'in_progress',
      status: '◐ Em jogo · 08:42',
      spoken: 'em andamento, 8 minutos e 42 segundos',
      action: 'Continuar',
      href: `/jogo/${playing.puzzleId}`,
    })
    const noTime = makeLibraryItem(today, { status: 'in_progress' })
    expect(todayCard('oglobo', [noTime], today, fresh)).toMatchObject({
      status: '◐ Em jogo',
      spoken: 'em andamento',
    })
  })

  it('concluída: tempo final e "Ver"; sem tempo, só o estado', () => {
    const done = makeLibraryItem(today, { status: 'completed', finishedMs: 987_000 })
    expect(todayCard('oglobo', [done], today, fresh)).toMatchObject({
      kind: 'completed',
      status: '✓ Concluída · 16:27',
      spoken: 'concluída em 16 minutos e 27 segundos',
      action: 'Ver',
      href: `/jogo/${done.puzzleId}`,
    })
    const noTime = makeLibraryItem(today, { status: 'completed' })
    expect(todayCard('oglobo', [noTime], today, fresh)).toMatchObject({
      status: '✓ Concluída',
      spoken: 'concluída',
    })
  })

  it('ainda não guardada: "Jogar" abre a busca do dia na fonte', () => {
    expect(todayCard('cruzadaonline', [], today, fresh)).toMatchObject({
      name: 'Cruzada Online',
      kind: 'fetchable',
      status: 'Ainda não guardada',
      spoken: 'ainda não guardada',
      action: 'Jogar',
      href: '/dia/2026-10-19?fonte=cruzadaonline',
    })
  })

  it('fonte fora do ar sem puzzle guardado: sem ação nem destino', () => {
    expect(todayCard('cruzadaonline', [], today, { down: true, noPuzzle: false })).toMatchObject({
      kind: 'fetchable',
      status: 'Fonte fora do ar agora',
      action: null,
      href: null,
    })
  })

  it('fonte fora do ar não esconde um puzzle já guardado', () => {
    const item = makeLibraryItem(today)
    expect(todayCard('oglobo', [item], today, { down: true, noPuzzle: false })).toMatchObject({
      action: 'Jogar',
      href: `/jogo/${item.puzzleId}`,
    })
  })

  it('sem cruzada hoje: sem ação nem destino', () => {
    expect(todayCard('oglobo', [], today, { down: false, noPuzzle: true })).toMatchObject({
      kind: 'none',
      status: 'Sem cruzada hoje',
      spoken: 'sem cruzada hoje',
      action: null,
      href: null,
    })
  })

  it('item de outro dia não conta como hoje', () => {
    const yesterday = makeLibraryItem('2026-10-18', { status: 'completed' })
    expect(todayCard('oglobo', [yesterday], today, fresh)).toMatchObject({ kind: 'fetchable' })
  })
})

import { describe, expect, it } from 'vitest'
import { makeLibraryItem } from '../../../test/fixtures'
import type { PuzzleSourceId } from '@cruzadinha/shared'
import { completedInMonth, completedLabel, otherSourceShortcut, todayCard } from './today-cards'

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

describe('completedInMonth', () => {
  const october = { year: 2026, month: 10 }

  it('conta só as concluídas do mês', () => {
    const items = [
      makeLibraryItem('2026-10-01', { status: 'completed' }),
      makeLibraryItem('2026-10-31', { status: 'completed' }),
      makeLibraryItem('2026-10-15', { status: 'in_progress' }),
      makeLibraryItem('2026-10-16'),
      makeLibraryItem('2026-09-30', { status: 'completed' }),
      makeLibraryItem('2026-11-01', { status: 'completed' }),
    ]
    expect(completedInMonth(items, october)).toBe(2)
  })

  it('lista vazia dá zero', () => {
    expect(completedInMonth([], october)).toBe(0)
  })
})

describe('completedLabel', () => {
  it.each([
    [0, '0 concluídas'],
    [1, '1 concluída'],
    [5, '5 concluídas'],
  ])('%i → %s', (count, label) => {
    expect(completedLabel(count)).toBe(label)
  })
})

describe('otherSourceShortcut', () => {
  const date = '2026-10-18'
  const fine = { isDown: () => false, isNoPuzzle: () => false }
  const online = (items: ReturnType<typeof makeLibraryItem>[], ready = true) => ({
    source: 'cruzadaonline' as PuzzleSourceId,
    name: 'Cruzada Online',
    ready,
    items,
  })
  const globo = { source: 'oglobo' as PuzzleSourceId, name: 'O Globo', ready: true, items: [] }

  it('oferece a outra fonte do dia quando não iniciada ou em andamento', () => {
    const fresh = makeLibraryItem(date, { source: 'cruzadaonline' })
    expect(otherSourceShortcut('oglobo', date, today, [globo, online([fresh])], fine)).toEqual({
      source: 'cruzadaonline',
      name: 'Cruzada Online',
      href: `/jogo/${fresh.puzzleId}`,
    })
    const playing = makeLibraryItem(date, { source: 'cruzadaonline', status: 'in_progress' })
    expect(otherSourceShortcut('oglobo', date, today, [globo, online([playing])], fine)).toEqual(
      expect.objectContaining({ href: `/jogo/${playing.puzzleId}` }),
    )
  })

  it('dia ainda não guardado leva à busca, a menos que a fonte esteja fora do ar', () => {
    expect(otherSourceShortcut('oglobo', date, today, [globo, online([])], fine)).toEqual(
      expect.objectContaining({ href: '/dia/2026-10-18?fonte=cruzadaonline' }),
    )
    expect(
      otherSourceShortcut('oglobo', date, today, [globo, online([])], {
        ...fine,
        isDown: (source) => source === 'cruzadaonline',
      }),
    ).toBeNull()
  })

  it('concluída, sem cruzada ou no futuro não gera atalho', () => {
    const done = makeLibraryItem(date, { source: 'cruzadaonline', status: 'completed' })
    expect(otherSourceShortcut('oglobo', date, today, [globo, online([done])], fine)).toBeNull()
    expect(
      otherSourceShortcut('oglobo', date, today, [globo, online([])], {
        ...fine,
        isNoPuzzle: () => true,
      }),
    ).toBeNull()
    expect(otherSourceShortcut('oglobo', '2026-10-20', today, [globo, online([])], fine)).toBeNull()
  })

  it('fonte que ainda carrega ou falhou é ignorada', () => {
    expect(otherSourceShortcut('oglobo', date, today, [globo, online([], false)], fine)).toBeNull()
  })

  it('com três fontes, oferece a primeira não concluída na ordem, sem a atual', () => {
    const third = { source: 'terceira' as PuzzleSourceId, name: 'Terceira', ready: true, items: [] }
    const done = makeLibraryItem(date, { source: 'cruzadaonline', status: 'completed' })
    expect(
      otherSourceShortcut('oglobo', date, today, [globo, online([done]), third], fine),
    ).toEqual(expect.objectContaining({ source: 'terceira', name: 'Terceira' }))
    expect(
      otherSourceShortcut('cruzadaonline', date, today, [globo, online([]), third], fine),
    ).toEqual(expect.objectContaining({ source: 'oglobo' }))
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetSettingsStore } from '../../../shared/services/settings-store/settings-store'
import {
  cellFor,
  cellFromDrag,
  clearBoardSize,
  fitCellSize,
  loadBoardSize,
  maxCellSize,
  resolveCellSize,
  saveBoardSize,
} from './board-size'

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('cellFor', () => {
  it('é a maior célula inteira com count·c + (count − 1) + 4 ≤ espaço', () => {
    // 11 células: 11·74 + 10 + 4 = 828 ≤ 838; 11·75 + 14 = 839 > 838.
    expect(cellFor(838, 11)).toBe(74)
    expect(cellFor(839, 11)).toBe(75)
    expect(cellFor(1230, 11)).toBe(110)
  })

  it('espaço zero ou negativo dá zero', () => {
    expect(cellFor(0, 11)).toBe(0)
    expect(cellFor(-50, 11)).toBe(0)
  })
})

describe('fitCellSize', () => {
  it('usa o menor entre largura e altura', () => {
    expect(fitCellSize({ width: 1230, height: 838, cols: 11, rows: 11 })).toBe(74)
    expect(fitCellSize({ width: 600, height: 2000, cols: 11, rows: 11 })).toBe(53)
  })

  it('fica entre 30 e 110', () => {
    expect(fitCellSize({ width: 5000, height: 5000, cols: 5, rows: 5 })).toBe(110)
    expect(fitCellSize({ width: 100, height: 100, cols: 11, rows: 11 })).toBe(30)
    expect(fitCellSize({ width: 0, height: -10, cols: 11, rows: 11 })).toBe(30)
  })

  it('considera grades que não são quadradas', () => {
    // 15 colunas e 11 linhas: a largura limita (15·c + 18 ≤ 1000 → 65).
    expect(fitCellSize({ width: 1000, height: 1000, cols: 15, rows: 11 })).toBe(65)
  })
})

describe('maxCellSize', () => {
  it('é o limite pela largura, entre 30 e 110', () => {
    expect(maxCellSize({ width: 1230, cols: 11 })).toBe(110)
    expect(maxCellSize({ width: 700, cols: 11 })).toBe(62)
    expect(maxCellSize({ width: 100, cols: 11 })).toBe(30)
  })
})

describe('resolveCellSize', () => {
  it('sem escolha vale o padrão', () => {
    expect(resolveCellSize({ fit: 74, max: 110, chosen: null })).toBe(74)
  })

  it('a escolha fica entre 30 e o máximo', () => {
    expect(resolveCellSize({ fit: 74, max: 110, chosen: 90 })).toBe(90)
    expect(resolveCellSize({ fit: 74, max: 62, chosen: 110 })).toBe(62)
    expect(resolveCellSize({ fit: 74, max: 110, chosen: 10 })).toBe(30)
  })
})

describe('cellFromDrag', () => {
  it('a largura conta em dobro, porque o bloco é centralizado', () => {
    expect(cellFromDrag({ startCell: 74, dx: 55, dy: 0, cols: 11, rows: 11 })).toBe(84)
  })

  it('usa o eixo em que o movimento foi maior', () => {
    expect(cellFromDrag({ startCell: 74, dx: 0, dy: -110, cols: 11, rows: 11 })).toBe(64)
    expect(cellFromDrag({ startCell: 74, dx: 11, dy: 55, cols: 11, rows: 11 })).toBe(79)
  })

  it('arredonda para inteiro', () => {
    expect(cellFromDrag({ startCell: 74, dx: 4, dy: 0, cols: 11, rows: 11 })).toBe(75)
  })
})

describe('preferência guardada', () => {
  it('grava, lê e apaga o tamanho nas configurações', () => {
    saveBoardSize(90)
    expect(loadBoardSize()).toBe(90)
    resetSettingsStore()
    expect(loadBoardSize()).toBe(90)
    clearBoardSize()
    expect(loadBoardSize()).toBeNull()
  })

  it('lê a escolha antiga {"cellSize": N} na migração', () => {
    window.localStorage.setItem('cruzadinha:board-size', '{"cellSize":72}')
    resetSettingsStore()
    expect(loadBoardSize()).toBe(72)
  })

  it.each([
    ['JSON inválido', '{'],
    ['campo ausente', '{}'],
    ['tipo errado', '{"cellSize":"90"}'],
    ['abaixo de 30', '{"cellSize":29}'],
    ['acima de 110', '{"cellSize":111}'],
    ['não inteiro', '{"cellSize":80.5}'],
  ])('escolha antiga com %s vira padrão', (_name, raw) => {
    window.localStorage.setItem('cruzadinha:board-size', raw)
    resetSettingsStore()
    expect(loadBoardSize()).toBeNull()
  })

  it('armazenamento que lança exceção vira padrão, sem lançar', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cheio')
    })
    resetSettingsStore()
    expect(loadBoardSize()).toBeNull()
    expect(() => saveBoardSize(90)).not.toThrow()
  })
})

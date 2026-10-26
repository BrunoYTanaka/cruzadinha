import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetSettingsStore } from '../../../shared/services/settings-store'
import {
  clampWidth,
  clearLibraryWidth,
  loadLibraryWidth,
  saveLibraryWidth,
  widthFromDrag,
} from './library-width'

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('widthFromDrag', () => {
  it('o deslocamento conta em dobro, porque o calendário é centralizado', () => {
    expect(widthFromDrag({ startWidth: 1000, dx: 50 })).toBe(1100)
    expect(widthFromDrag({ startWidth: 1000, dx: -100.4 })).toBe(799)
  })
})

describe('clampWidth', () => {
  it('fica entre 720 e o menor entre 1600 e o disponível', () => {
    expect(clampWidth(500, 1888)).toBe(720)
    expect(clampWidth(2000, 1888)).toBe(1600)
    expect(clampWidth(1600, 1000)).toBe(1000)
    expect(clampWidth(900, 1000)).toBe(900)
  })

  it('com menos espaço que o mínimo, o disponível manda', () => {
    expect(clampWidth(1200, 700)).toBe(700)
  })
})

describe('preferência guardada', () => {
  it('grava, lê e apaga a largura nas configurações', () => {
    saveLibraryWidth(1200)
    expect(loadLibraryWidth()).toBe(1200)
    resetSettingsStore()
    expect(loadLibraryWidth()).toBe(1200)
    clearLibraryWidth()
    expect(loadLibraryWidth()).toBeNull()
  })

  it('lê a escolha antiga {"width": N} na migração', () => {
    window.localStorage.setItem('cruzadinha:library-width', '{"width":1200}')
    resetSettingsStore()
    expect(loadLibraryWidth()).toBe(1200)
  })

  it.each([
    ['JSON inválido', '{'],
    ['texto', '"x"'],
    ['abaixo de 720', '{"width":719}'],
    ['acima de 1600', '{"width":1601}'],
    ['não inteiro', '{"width":1000.5}'],
  ])('escolha antiga com %s vira ajuste automático', (_name, raw) => {
    window.localStorage.setItem('cruzadinha:library-width', raw)
    resetSettingsStore()
    expect(loadLibraryWidth()).toBeNull()
  })

  it('armazenamento que lança exceção vira ajuste automático', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    resetSettingsStore()
    expect(loadLibraryWidth()).toBeNull()
  })
})

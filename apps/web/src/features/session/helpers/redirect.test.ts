import { describe, expect, it } from 'vitest'
import { buildLoginPath, safeNext } from './redirect'

describe('buildLoginPath', () => {
  it('da raiz vai ao login puro; de outro lugar leva o endereço em ?next=', () => {
    expect(buildLoginPath('/')).toBe('/login')
    expect(buildLoginPath('/conta')).toBe('/login?next=%2Fconta')
  })
})

describe('safeNext', () => {
  it('sem destino válido leva ao calendário, não à landing (feature 048)', () => {
    expect(safeNext(null)).toBe('/calendario')
    expect(safeNext('')).toBe('/calendario')
    expect(safeNext('https://mal.example')).toBe('/calendario')
    expect(safeNext('//mal.example')).toBe('/calendario')
    expect(safeNext('/login?next=/x')).toBe('/calendario')
    expect(safeNext('/cadastro')).toBe('/calendario')
  })

  it('aceita caminhos internos', () => {
    expect(safeNext('/conta')).toBe('/conta')
    expect(safeNext('/dia/2026-10-01?fonte=oglobo')).toBe('/dia/2026-10-01?fonte=oglobo')
  })
})

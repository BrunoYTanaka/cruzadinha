import { expect, test } from '@playwright/test'
import {
  login,
  progressRowCount,
  resetAndSeed,
  todayLink,
  todaySolution,
  typedLetter,
} from './support'

test.beforeEach(async () => {
  await resetAndSeed()
})

// Joga uma letra como visitante e entra na conta: a oferta de importação aparece (feature 057).
async function playOneLetterAsGuest(page: import('@playwright/test').Page) {
  await page.goto('/calendario')
  await todayLink(page).click()
  await expect(page.getByRole('grid')).toBeVisible()
  const solution = await todaySolution(page.request)
  const first = (solution[0] ?? []).filter((letter): letter is string => Boolean(letter))
  await page.keyboard.press(typedLetter(first[0] ?? 'A'))
  // Feature 063: o visitante não tem mais o aviso de progresso só neste aparelho.
  await expect(page.getByText('Progresso só neste aparelho')).toHaveCount(0)
}

test('importa o progresso de visitante ao entrar e esvazia o aparelho', async ({ page }) => {
  await playOneLetterAsGuest(page)
  await page.waitForTimeout(500)

  await login(page)
  const offer = page.getByRole('dialog', { name: 'Importar seu progresso de visitante?' })
  await expect(offer).toBeVisible()
  await offer.getByRole('button', { name: 'Importar' }).click()
  await expect(page.getByRole('dialog', { name: 'Progresso importado' })).toBeVisible()
  expect(await progressRowCount()).toBe(1)

  await page.getByRole('button', { name: 'Fechar' }).click()
  const databases = await page.evaluate(async () =>
    (await indexedDB.databases()).map((db) => db.name),
  )
  const remaining = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('cruzadinha-visitante')
        open.onsuccess = () => {
          const db = open.result
          if (!db.objectStoreNames.contains('progress')) return resolve(0)
          const count = db.transaction('progress').objectStore('progress').count()
          count.onsuccess = () => resolve(count.result)
        }
      }),
  )
  expect(databases).toContain('cruzadinha-visitante')
  expect(remaining).toBe(0)
})

test('"Agora não" mantém o progresso e a oferta volta ao recarregar', async ({ page }) => {
  await playOneLetterAsGuest(page)
  await page.waitForTimeout(500)

  await login(page)
  const offer = page.getByRole('dialog', { name: 'Importar seu progresso de visitante?' })
  await offer.getByRole('button', { name: 'Agora não' }).click()
  await expect(offer).toHaveCount(0)
  expect(await progressRowCount()).toBe(0)

  await page.reload()
  await expect(offer).toBeVisible()
})

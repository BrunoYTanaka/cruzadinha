import { expect } from 'vitest'
import { axe } from 'vitest-axe'

// O jsdom não calcula cores, então o contraste fica a cargo do teste dos tokens e do
// Playwright (axe no navegador real).
export async function expectNoA11yViolations(container: Element) {
  const results = await axe(container, { rules: { 'color-contrast': { enabled: false } } })
  expect(results.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([])
}

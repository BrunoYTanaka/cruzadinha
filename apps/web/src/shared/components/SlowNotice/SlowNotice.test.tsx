import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../../test/axe'
import { SLOW_MESSAGE } from '../LoadingState/loading-screens'
import { SlowNotice } from './SlowNotice'

describe('SlowNotice', () => {
  it('fica vazio, mas presente, enquanto inativo', () => {
    render(<SlowNotice active={false} />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('mostra a mensagem da soneca quando ativo', async () => {
    const { container } = render(<SlowNotice active />)
    expect(screen.getByRole('status')).toHaveTextContent(SLOW_MESSAGE)
    await expectNoA11yViolations(container)
  })
})

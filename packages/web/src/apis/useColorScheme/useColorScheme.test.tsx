import { act } from 'react'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { installFakeMatchMedia } from '../../test/matchMedia'
import { cleanup, render } from '../../test/render'
import { Appearance, resetAppearance } from '../Appearance'
import { useColorScheme } from './index'

const DARK = '(prefers-color-scheme: dark)'

function Scheme(): React.ReactElement {
  return <span>{String(useColorScheme())}</span>
}

describe('useColorScheme', () => {
  let media: ReturnType<typeof installFakeMatchMedia>

  beforeEach(() => {
    resetAppearance()
    media = installFakeMatchMedia()
  })
  afterEach(() => {
    cleanup()
    resetAppearance()
    media.restore()
  })

  test('returns the current scheme', () => {
    media.get(DARK).matches = true
    const { container } = render(<Scheme />)
    expect(container.textContent).toBe('dark')
  })

  test('updates when the preference changes', () => {
    const { container } = render(<Scheme />)
    expect(container.textContent).toBe('light')
    act(() => media.get(DARK).set(true))
    expect(container.textContent).toBe('dark')
  })

  test('updates on setColorScheme', () => {
    const { container } = render(<Scheme />)
    act(() => Appearance.setColorScheme('dark'))
    expect(container.textContent).toBe('dark')
    act(() => Appearance.setColorScheme(null))
    expect(container.textContent).toBe('light')
  })
})

import { act } from 'react'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { cleanup, render } from '../../test/render'
import { resetDimensions } from '../Dimensions'
import { useWindowDimensions } from './index'

const setInnerSize = (width: number, height: number): void => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
}

function Size(): React.ReactElement {
  const { width, height } = useWindowDimensions()
  return (
    <span>
      {width}x{height}
    </span>
  )
}

describe('useWindowDimensions', () => {
  const innerWidth = window.innerWidth
  const innerHeight = window.innerHeight

  beforeEach(resetDimensions)
  afterEach(() => {
    cleanup()
    setInnerSize(innerWidth, innerHeight)
    resetDimensions()
  })

  test('returns the window size', () => {
    const { container } = render(<Size />)
    expect(container.textContent).toBe(`${window.innerWidth}x${window.innerHeight}`)
  })

  test('updates on resize', () => {
    const { container } = render(<Size />)
    act(() => {
      setInnerSize(400, 300)
      window.dispatchEvent(new Event('resize'))
    })
    expect(container.textContent).toBe('400x300')
  })
})

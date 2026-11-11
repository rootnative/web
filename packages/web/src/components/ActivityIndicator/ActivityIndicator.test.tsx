import { createRef } from 'react'
import { afterEach, describe, expect, test } from 'vitest'

import { cleanup, render } from '../../test/render'
import { ActivityIndicator } from './index'

afterEach(cleanup)

const indicator = (): HTMLElement => document.querySelector('[role="progressbar"]') as HTMLElement

const spinner = (): SVGSVGElement => indicator().querySelector('svg') as SVGSVGElement

const strokes = (): Array<string | null> =>
  Array.from(spinner().querySelectorAll('circle'), (circle) => circle.getAttribute('stroke'))

describe('ActivityIndicator', () => {
  test('renders a small, gray, spinning progressbar by default', () => {
    render(<ActivityIndicator />)
    const rect = indicator().getBoundingClientRect()
    expect(rect.width).toBe(20)
    expect(rect.height).toBe(20)
    expect(strokes()).toEqual(['rgb(153,153,153)', 'rgb(153,153,153)'])
    expect(getComputedStyle(spinner()).animationName).toBe('rn-activity-indicator-spin')
    expect(getComputedStyle(spinner()).animationPlayState).toBe('running')
    expect(getComputedStyle(indicator()).visibility).toBe('visible')
  })

  test('size large is 36 px, and a number is that size', () => {
    const { rerender } = render(<ActivityIndicator size="large" />)
    expect(indicator().getBoundingClientRect().width).toBe(36)
    expect(indicator().getBoundingClientRect().height).toBe(36)

    rerender(<ActivityIndicator size={48} />)
    expect(indicator().getBoundingClientRect().width).toBe(48)
    expect(indicator().getBoundingClientRect().height).toBe(48)
  })

  test('color sets the color of the spinner', () => {
    render(<ActivityIndicator color="#2563eb" />)
    expect(strokes()).toEqual(['rgb(37,99,235)', 'rgb(37,99,235)'])
  })

  test('animating false hides the indicator and keeps its space', () => {
    render(<ActivityIndicator animating={false} />)
    expect(getComputedStyle(indicator()).visibility).toBe('hidden')
    expect(indicator().getBoundingClientRect().width).toBe(20)
    expect(getComputedStyle(spinner()).animationPlayState).toBe('paused')
  })

  test('hidesWhenStopped false keeps a stopped indicator visible', () => {
    render(<ActivityIndicator animating={false} hidesWhenStopped={false} />)
    expect(getComputedStyle(indicator()).visibility).toBe('visible')
    expect(getComputedStyle(spinner()).animationPlayState).toBe('paused')
  })

  test('style goes to the container, which centers the indicator', () => {
    render(<ActivityIndicator style={{ width: 100, height: 60 }} />)
    const container = indicator().parentElement as HTMLElement
    const outer = container.getBoundingClientRect()
    const inner = indicator().getBoundingClientRect()
    expect(outer.width).toBe(100)
    expect(outer.height).toBe(60)
    expect(inner.left - outer.left).toBe(40)
    expect(inner.top - outer.top).toBe(20)
  })

  test('the ref and the other props go to the indicator', () => {
    const ref = createRef<HTMLElement>()
    render(<ActivityIndicator ref={ref} testID="spinner" accessibilityLabel="Loading" />)
    expect(ref.current).toBe(indicator())
    expect(indicator().getAttribute('data-testid')).toBe('spinner')
    expect(indicator().getAttribute('aria-label')).toBe('Loading')
  })

  test('onLayout gets the size of the container', async () => {
    let size: { width: number; height: number } | undefined
    render(
      <ActivityIndicator
        style={{ width: 100, height: 60 }}
        onLayout={(event) => {
          size = event.nativeEvent.layout
        }}
      />,
    )
    await expect.poll(() => size?.width).toBe(100)
    expect(size?.height).toBe(60)
  })
})

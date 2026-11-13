import { act, createRef, useState, type ReactElement } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { cleanup, render } from '../../test/render'
import { Switch } from './index'
import type { SwitchChangeEvent, SwitchProps } from './types'

afterEach(cleanup)

const input = (): HTMLInputElement => document.querySelector('input') as HTMLInputElement

const root = (): HTMLElement => input().parentElement as HTMLElement

const part = (name: string): HTMLElement =>
  root().querySelector(`.rn-switch-${name}`) as HTMLElement

// The distance from the start edge of the switch to the start edge of the thumb.
const thumbOffset = (): number =>
  Math.round(part('thumb').getBoundingClientRect().left - root().getBoundingClientRect().left)

// The colors and the thumb move with CSS transitions. A headless WebKit can hold the clock of a
// transition, so a test jumps each one to its end value and doesn't wait for it.
const settle = (): void => {
  for (const animation of root().getAnimations({ subtree: true })) animation.finish()
}

const user = async (action: () => Promise<void>): Promise<void> => {
  await act(action)
}

function Controlled(props: SwitchProps): ReactElement {
  const [value, setValue] = useState(false)
  return <Switch {...props} value={value} onValueChange={setValue} />
}

describe('Switch', () => {
  test('renders a checkbox with the role switch, and ref is the input', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Switch ref={ref} />)
    expect(input().type).toBe('checkbox')
    expect(input().getAttribute('role')).toBe('switch')
    expect(input().checked).toBe(false)
    expect(ref.current).toBe(input())
  })

  test('is 40 by 20 px, and the input covers it', () => {
    render(<Switch />)
    const outer = root().getBoundingClientRect()
    const inner = input().getBoundingClientRect()
    expect(outer.width).toBe(40)
    expect(outer.height).toBe(20)
    expect(inner.width).toBe(40)
    expect(inner.height).toBe(20)
    expect(part('track').getBoundingClientRect().height).toBe(14)
    expect(part('thumb').getBoundingClientRect().width).toBe(20)
  })

  test('off: the default colors, and the thumb at the start', () => {
    render(<Switch />)
    expect(getComputedStyle(part('track')).backgroundColor).toBe('rgb(147, 147, 147)')
    expect(getComputedStyle(part('thumb')).backgroundColor).toBe('rgb(250, 250, 250)')
    expect(thumbOffset()).toBe(0)
  })

  test('on: the default colors, and the thumb at the end', () => {
    render(<Switch value />)
    expect(input().checked).toBe(true)
    settle()
    expect(getComputedStyle(part('track')).backgroundColor).toBe('rgb(163, 211, 207)')
    expect(getComputedStyle(part('thumb')).backgroundColor).toBe('rgb(0, 150, 136)')
    expect(thumbOffset()).toBe(20)
  })

  test('in a right-to-left layout, the thumb of an on switch is at the left', () => {
    render(
      <div dir="rtl">
        <Switch value />
      </div>,
    )
    settle()
    expect(thumbOffset()).toBe(0)
  })

  test('trackColor and thumbColor set the colors', () => {
    const trackColor = { false: '#fecaca', true: '#bbf7d0' }
    const { rerender } = render(<Switch trackColor={trackColor} thumbColor="#111827" />)
    settle()
    expect(getComputedStyle(part('track')).backgroundColor).toBe('rgb(254, 202, 202)')
    expect(getComputedStyle(part('thumb')).backgroundColor).toBe('rgb(17, 24, 39)')

    rerender(<Switch value trackColor={trackColor} thumbColor="#111827" />)
    settle()
    expect(getComputedStyle(part('track')).backgroundColor).toBe('rgb(187, 247, 208)')
    expect(getComputedStyle(part('thumb')).backgroundColor).toBe('rgb(17, 24, 39)')
  })

  test('a click calls onChange, then onValueChange, with the new value', async () => {
    const calls: unknown[] = []
    const onChange = (event: SwitchChangeEvent): void => {
      calls.push(['change', event.nativeEvent.value, event.nativeEvent.target])
    }
    const onValueChange = (value: boolean): void => {
      calls.push(['value', value])
    }
    render(<Switch onChange={onChange} onValueChange={onValueChange} />)
    await user(() => userEvent.click(input()))
    expect(calls).toEqual([
      ['change', true, input()],
      ['value', true],
    ])
  })

  test('the switch follows value when the parent updates it', async () => {
    render(<Controlled />)
    await user(() => userEvent.click(input()))
    expect(input().checked).toBe(true)
    settle()
    expect(thumbOffset()).toBe(20)
    await user(() => userEvent.click(input()))
    expect(input().checked).toBe(false)
    settle()
    expect(thumbOffset()).toBe(0)
  })

  test('the switch goes back when value does not change', async () => {
    const onValueChange = vi.fn()
    render(<Switch value={false} onValueChange={onValueChange} />)
    await user(() => userEvent.click(input()))
    expect(onValueChange).toHaveBeenCalledWith(true)
    expect(input().checked).toBe(false)
    settle()
    expect(thumbOffset()).toBe(0)
  })

  test('Space toggles a focused switch', async () => {
    render(<Controlled />)
    await user(() => userEvent.tab())
    expect(document.activeElement).toBe(input())
    await user(() => userEvent.keyboard(' '))
    expect(input().checked).toBe(true)
  })

  test('a click on a label toggles the switch', async () => {
    render(
      <>
        <label htmlFor="wifi">Wi-Fi</label>
        <Controlled id="wifi" />
      </>,
    )
    await user(() => userEvent.click(document.querySelector('label') as HTMLElement))
    expect(input().checked).toBe(true)
  })

  test('disabled stops the change, dims the switch, and leaves the tab order', async () => {
    const onValueChange = vi.fn()
    render(<Switch disabled onValueChange={onValueChange} />)
    expect(input().disabled).toBe(true)
    expect(getComputedStyle(root()).opacity).toBe('0.5')
    act(() => input().click())
    expect(onValueChange).not.toHaveBeenCalled()
    await user(() => userEvent.tab())
    expect(document.activeElement).not.toBe(input())
  })

  test('accessibilityState.disabled disables the switch, and disabled={false} wins', () => {
    const { rerender } = render(<Switch accessibilityState={{ disabled: true }} />)
    expect(input().disabled).toBe(true)
    rerender(<Switch disabled={false} accessibilityState={{ disabled: true }} />)
    expect(input().disabled).toBe(false)
  })

  test('style and onLayout go to the root, the other props go to the input', async () => {
    let width: number | undefined
    render(
      <Switch
        testID="wifi"
        accessibilityLabel="Wi-Fi"
        style={{ width: 60, height: 30, margin: 4 }}
        onLayout={(event) => {
          width = event.nativeEvent.layout.width
        }}
      />,
    )
    expect(input().getAttribute('data-testid')).toBe('wifi')
    expect(input().getAttribute('aria-label')).toBe('Wi-Fi')
    expect(root().getBoundingClientRect().width).toBe(60)
    expect(part('thumb').getBoundingClientRect().width).toBe(30)
    await expect.poll(() => width).toBe(60)
  })

  test('a role or an accessibilityRole replaces the role switch', () => {
    const { rerender } = render(<Switch role="checkbox" />)
    expect(input().getAttribute('role')).toBe('checkbox')
    rerender(<Switch accessibilityRole="togglebutton" />)
    expect(input().getAttribute('role')).toBe('togglebutton')
  })
})

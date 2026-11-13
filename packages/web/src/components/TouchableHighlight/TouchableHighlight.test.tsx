import { act, createRef } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { cleanup, render } from '../../test/render'
import { View } from '../View'
import { TouchableHighlight } from './index'
import type { HostInstance } from '../View/types'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const box = { width: 100, height: 100 }

const byTestId = (id: string): HTMLElement =>
  document.querySelector(`[data-testid="${id}"]`) as HTMLElement

const touch = (element: Element, type: string): void => {
  const rect = element.getBoundingClientRect()
  act(() => {
    element.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        clientX: rect.left + 10,
        clientY: rect.top + 10,
      }),
    )
  })
}

const user = async (action: () => Promise<void>): Promise<void> => {
  await act(action)
}

const background = (id: string): string => getComputedStyle(byTestId(id)).backgroundColor
const opacity = (id: string): string => getComputedStyle(byTestId(id)).opacity

describe('TouchableHighlight', () => {
  test('renders a div around its child, and ref is the element', () => {
    const ref = createRef<HostInstance>()
    render(
      <TouchableHighlight ref={ref} testID="t" onPress={() => {}}>
        <View testID="child" style={box} />
      </TouchableHighlight>,
    )
    const element = byTestId('t')
    expect(element.tagName).toBe('DIV')
    expect(element.tabIndex).toBe(0)
    expect(element.firstElementChild).toBe(byTestId('child'))
    expect(ref.current).toBe(element)
  })

  test('shows the underlay while pressed, and flashes it after the press', () => {
    const onPress = vi.fn()
    render(
      <TouchableHighlight testID="t" onPress={onPress}>
        <View testID="child" style={box} />
      </TouchableHighlight>,
    )
    expect(background('t')).toBe('rgba(0, 0, 0, 0)')

    vi.useFakeTimers()
    touch(byTestId('t'), 'pointerdown')
    expect(background('t')).toBe('rgb(0, 0, 0)')
    expect(opacity('child')).toBe('0.85')

    touch(byTestId('t'), 'pointerup')
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(background('t')).toBe('rgb(0, 0, 0)')
    act(() => vi.advanceTimersByTime(0))
    expect(background('t')).toBe('rgba(0, 0, 0, 0)')
    expect(opacity('child')).toBe('1')
  })

  test('underlayColor and activeOpacity', () => {
    render(
      <TouchableHighlight testID="t" underlayColor="#ff0000" activeOpacity={0.5} onPress={() => {}}>
        <View testID="child" style={box} />
      </TouchableHighlight>,
    )
    touch(byTestId('t'), 'pointerdown')
    expect(background('t')).toBe('rgb(255, 0, 0)')
    expect(opacity('child')).toBe('0.5')
  })

  test('delayPressOut keeps the underlay that long after the press', () => {
    render(
      <TouchableHighlight testID="t" delayPressOut={100} onPress={() => {}}>
        <View style={box} />
      </TouchableHighlight>,
    )
    vi.useFakeTimers()
    touch(byTestId('t'), 'pointerdown')
    touch(byTestId('t'), 'pointerup')
    act(() => vi.advanceTimersByTime(99))
    expect(background('t')).toBe('rgb(0, 0, 0)')
    act(() => vi.advanceTimersByTime(1))
    expect(background('t')).toBe('rgba(0, 0, 0, 0)')
  })

  test('onShowUnderlay and onHideUnderlay', () => {
    const onShowUnderlay = vi.fn()
    const onHideUnderlay = vi.fn()
    render(
      <TouchableHighlight
        testID="t"
        onPressIn={() => {}}
        onShowUnderlay={onShowUnderlay}
        onHideUnderlay={onHideUnderlay}
      >
        <View style={box} />
      </TouchableHighlight>,
    )
    touch(byTestId('t'), 'pointerdown')
    expect(onShowUnderlay).toHaveBeenCalledTimes(1)
    touch(byTestId('t'), 'pointerup')
    expect(onHideUnderlay).toHaveBeenCalledTimes(1)
  })

  test('with no press handler, there is no underlay', () => {
    render(
      <TouchableHighlight testID="t">
        <View style={box} />
      </TouchableHighlight>,
    )
    touch(byTestId('t'), 'pointerdown')
    expect(background('t')).toBe('rgba(0, 0, 0, 0)')
  })

  test('testOnly_pressed shows the underlay', () => {
    render(
      <TouchableHighlight testID="t" testOnly_pressed onPress={() => {}}>
        <View testID="child" style={box} />
      </TouchableHighlight>,
    )
    expect(background('t')).toBe('rgb(0, 0, 0)')
    expect(opacity('child')).toBe('0.85')
  })

  test('the child keeps its own style, with the opacity on top', () => {
    render(
      <TouchableHighlight testID="t" onPress={() => {}}>
        <View testID="child" style={[box, { opacity: 0.9, backgroundColor: 'white' }]} />
      </TouchableHighlight>,
    )
    expect(opacity('child')).toBe('0.9')
    touch(byTestId('t'), 'pointerdown')
    expect(opacity('child')).toBe('0.85')
    expect(background('child')).toBe('rgb(255, 255, 255)')
  })

  test('disabled: no press, no underlay, aria-disabled, and out of the tab order', async () => {
    const onPress = vi.fn()
    render(
      <TouchableHighlight testID="t" disabled onPress={onPress}>
        <View style={box} />
      </TouchableHighlight>,
    )
    const element = byTestId('t')
    expect(element.getAttribute('aria-disabled')).toBe('true')
    expect(element.tabIndex).toBe(-1)
    await user(() => userEvent.click(element))
    expect(onPress).not.toHaveBeenCalled()
    expect(background('t')).toBe('rgba(0, 0, 0, 0)')
  })

  test('Enter presses it, and onFocus fires', async () => {
    const onPress = vi.fn()
    const onFocus = vi.fn()
    render(
      <TouchableHighlight testID="t" onPress={onPress} onFocus={onFocus}>
        <View style={box} />
      </TouchableHighlight>,
    )
    act(() => byTestId('t').focus())
    expect(onFocus).toHaveBeenCalledTimes(1)
    await user(() => userEvent.keyboard('{Enter}'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test('hitSlop grows the hit area', () => {
    render(
      <TouchableHighlight testID="t" hitSlop={8} onPress={() => {}}>
        <View style={box} />
      </TouchableHighlight>,
    )
    expect(getComputedStyle(byTestId('t'), '::before').left).toBe('-8px')
  })
})

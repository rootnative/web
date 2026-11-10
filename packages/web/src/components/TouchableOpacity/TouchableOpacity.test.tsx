import { act, createRef } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { cleanup, render } from '../../test/render'
import { TouchableOpacity } from './index'

afterEach(cleanup)

const box = { width: 100, height: 100 }

const byTestId = (id: string): HTMLElement =>
  document.querySelector(`[data-testid="${id}"]`) as HTMLElement

const pointer = (element: Element, type: string, x = 10, y = 10): void => {
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
        clientX: rect.left + x,
        clientY: rect.top + y,
      }),
    )
  })
}

const user = async (action: () => Promise<void>): Promise<void> => {
  await act(action)
}

const lastAnimation = (element: HTMLElement): Animation | undefined =>
  element.getAnimations().at(-1)

const durationOf = (animation: Animation | undefined): unknown =>
  animation?.effect?.getTiming().duration

const finish = (element: HTMLElement): void => {
  for (const animation of element.getAnimations()) animation.finish()
}

describe('TouchableOpacity', () => {
  test('renders a div, and ref is the element', () => {
    const ref = createRef<HTMLElement>()
    render(<TouchableOpacity ref={ref} testID="t" style={box} onPress={() => {}} />)
    const element = byTestId('t')
    expect(element.tagName).toBe('DIV')
    expect(element.tabIndex).toBe(0)
    expect(ref.current).toBe(element)
  })

  test('a press calls onPressIn, onPress, and onPressOut', async () => {
    const onPressIn = vi.fn()
    const onPress = vi.fn()
    const onPressOut = vi.fn()
    render(
      <TouchableOpacity
        testID="t"
        style={box}
        onPressIn={onPressIn}
        onPress={onPress}
        onPressOut={onPressOut}
      />,
    )
    await user(() => userEvent.click(byTestId('t')))
    expect(onPressIn).toHaveBeenCalledTimes(1)
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(onPressOut).toHaveBeenCalledTimes(1)
  })

  test('dims to activeOpacity at once when the press starts', () => {
    render(<TouchableOpacity testID="t" style={box} onPress={() => {}} />)
    const element = byTestId('t')
    pointer(element, 'pointerdown')
    const animation = lastAnimation(element)
    expect(durationOf(animation)).toBe(0)
    expect(animation?.effect?.getTiming().easing).toBe('cubic-bezier(0.455, 0.03, 0.515, 0.955)')
    finish(element)
    expect(getComputedStyle(element).opacity).toBe('0.2')
  })

  test('a custom activeOpacity', () => {
    render(<TouchableOpacity testID="t" style={box} activeOpacity={0.6} onPress={() => {}} />)
    const element = byTestId('t')
    pointer(element, 'pointerdown')
    finish(element)
    expect(getComputedStyle(element).opacity).toBe('0.6')
  })

  test("fades back to the style's opacity over 250 ms, then lets the style take over", async () => {
    render(<TouchableOpacity testID="t" style={[box, { opacity: 0.8 }]} onPress={() => {}} />)
    const element = byTestId('t')
    pointer(element, 'pointerdown')
    finish(element)
    pointer(element, 'pointerup')
    expect(durationOf(lastAnimation(element))).toBe(250)
    finish(element)
    expect(getComputedStyle(element).opacity).toBe('0.8')
    await vi.waitFor(() => expect(element.getAnimations()).toHaveLength(0))
    expect(getComputedStyle(element).opacity).toBe('0.8')
  })

  test('dims over 150 ms when the pointer comes back into the press area', () => {
    render(<TouchableOpacity testID="t" style={box} onPress={() => {}} />)
    const element = byTestId('t')
    pointer(element, 'pointerdown')
    pointer(element, 'pointermove', 400, 400)
    expect(durationOf(lastAnimation(element))).toBe(250)
    pointer(element, 'pointermove', 10, 10)
    expect(durationOf(lastAnimation(element))).toBe(150)
  })

  test('a change of disabled fades to rest', () => {
    const { rerender } = render(<TouchableOpacity testID="t" style={box} onPress={() => {}} />)
    const element = byTestId('t')
    expect(element.getAnimations()).toHaveLength(0)
    rerender(<TouchableOpacity testID="t" style={box} onPress={() => {}} disabled />)
    expect(durationOf(lastAnimation(element))).toBe(250)
  })

  test('disabled: no press, aria-disabled, and out of the tab order', async () => {
    const onPress = vi.fn()
    render(<TouchableOpacity testID="t" style={box} disabled onPress={onPress} />)
    const element = byTestId('t')
    expect(element.getAttribute('aria-disabled')).toBe('true')
    expect(element.tabIndex).toBe(-1)
    await user(() => userEvent.click(element))
    expect(onPress).not.toHaveBeenCalled()
    expect(element.getAnimations()).toHaveLength(0)
  })

  test('without onPress, it is out of the tab order', () => {
    render(<TouchableOpacity testID="t" style={box} onLongPress={() => {}} />)
    expect(byTestId('t').tabIndex).toBe(-1)
  })

  test('Enter presses it', async () => {
    const onPress = vi.fn()
    render(<TouchableOpacity testID="t" style={box} onPress={onPress} />)
    act(() => byTestId('t').focus())
    await user(() => userEvent.keyboard('{Enter}'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test('onFocus and onBlur get the focus events', () => {
    const onFocus = vi.fn()
    const onBlur = vi.fn()
    render(<TouchableOpacity testID="t" onPress={() => {}} onFocus={onFocus} onBlur={onBlur} />)
    act(() => byTestId('t').focus())
    act(() => byTestId('t').blur())
    expect(onFocus).toHaveBeenCalledTimes(1)
    expect(onBlur).toHaveBeenCalledTimes(1)
  })

  test('app DOM handlers run first', async () => {
    const calls: string[] = []
    render(
      <TouchableOpacity
        testID="t"
        style={box}
        onPointerDown={() => calls.push('pointerdown')}
        onPress={() => calls.push('press')}
      />,
    )
    await user(() => userEvent.click(byTestId('t')))
    expect(calls).toEqual(['pointerdown', 'press'])
  })

  test('hitSlop grows the hit area, and rejectResponderTermination sets touch-action none', () => {
    render(
      <TouchableOpacity
        testID="t"
        style={box}
        hitSlop={10}
        rejectResponderTermination
        onPress={() => {}}
      />,
    )
    const element = byTestId('t')
    expect(getComputedStyle(element, '::before').top).toBe('-10px')
    expect(getComputedStyle(element).touchAction).toBe('none')
  })

  test('TV and Android props do not reach the DOM', () => {
    render(<TouchableOpacity testID="t" hasTVPreferredFocus nextFocusDown={1} touchSoundDisabled />)
    const element = byTestId('t')
    for (const name of ['hastvpreferredfocus', 'nextfocusdown', 'touchsounddisabled']) {
      expect(element.hasAttribute(name)).toBe(false)
    }
  })
})

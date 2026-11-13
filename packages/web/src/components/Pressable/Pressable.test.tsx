import { act, createRef } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { cleanup, render } from '../../test/render'
import { Text } from '../Text'
import { View } from '../View'
import { Pressable } from './index'
import type { HostInstance } from '../View/types'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const box = { width: 100, height: 100 }

const byTestId = (id: string): HTMLElement =>
  document.querySelector(`[data-testid="${id}"]`) as HTMLElement

const exists = (id: string): boolean => document.querySelector(`[data-testid="${id}"]`) !== null

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

describe('Pressable', () => {
  test('renders a focusable div, and ref is the element', () => {
    const ref = createRef<HostInstance>()
    render(<Pressable ref={ref} testID="p" style={box} />)
    const element = byTestId('p')
    expect(element.tagName).toBe('DIV')
    expect(element.tabIndex).toBe(0)
    expect(ref.current).toBe(element)
  })

  test('a click calls onPressIn, onPress, and onPressOut', async () => {
    const onPressIn = vi.fn()
    const onPress = vi.fn()
    const onPressOut = vi.fn()
    render(
      <Pressable
        testID="p"
        style={box}
        onPressIn={onPressIn}
        onPress={onPress}
        onPressOut={onPressOut}
      />,
    )
    await user(() => userEvent.click(byTestId('p')))
    await vi.waitFor(() => expect(onPressOut).toHaveBeenCalledTimes(1))
    expect(onPressIn).toHaveBeenCalledTimes(1)
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  describe('state', () => {
    test('style and children get pressed', () => {
      render(
        <Pressable testID="p" style={({ pressed }) => [box, pressed && { opacity: 0.5 }]}>
          {({ pressed }) => <View testID={pressed ? 'down' : 'up'} />}
        </Pressable>,
      )
      const element = byTestId('p')
      expect(getComputedStyle(element).opacity).toBe('1')
      expect(exists('up')).toBe(true)

      vi.useFakeTimers()
      touch(element, 'pointerdown')
      expect(getComputedStyle(element).opacity).toBe('0.5')
      expect(exists('down')).toBe(true)

      touch(element, 'pointerup')
      act(() => vi.advanceTimersByTime(130))
      expect(getComputedStyle(element).opacity).toBe('1')
      expect(exists('up')).toBe(true)
    })

    test('testOnly_pressed forces pressed', () => {
      render(
        <Pressable testOnly_pressed>
          {({ pressed }) => <View testID={pressed ? 'down' : 'up'} />}
        </Pressable>,
      )
      expect(exists('down')).toBe(true)
    })

    test('hovered follows a mouse, not a touch', async () => {
      render(
        <Pressable testID="p" style={box}>
          {({ hovered }) => <View testID={hovered ? 'over' : 'out'} />}
        </Pressable>,
      )
      const element = byTestId('p')
      await user(() => userEvent.unhover(element))

      touch(element, 'pointerover')
      expect(exists('out')).toBe(true)

      await user(() => userEvent.hover(element))
      expect(exists('over')).toBe(true)
      await user(() => userEvent.unhover(element))
      expect(exists('out')).toBe(true)
    })

    test('focused follows keyboard focus, not a mouse click', async () => {
      render(
        <>
          <View testID="before" focusable />
          <Pressable testID="p" style={box}>
            {({ focused }) => <View testID={focused ? 'ring' : 'plain'} />}
          </Pressable>
        </>,
      )
      const element = byTestId('p')
      await user(() => userEvent.click(element))
      expect(document.activeElement).toBe(element)
      expect(exists('plain')).toBe(true)

      act(() => byTestId('before').focus())
      await user(() => userEvent.tab())
      expect(document.activeElement).toBe(element)
      expect(exists('ring')).toBe(true)

      act(() => element.blur())
      expect(exists('plain')).toBe(true)
    })
  })

  describe('hitSlop', () => {
    test('grows the hit area', () => {
      render(
        <View style={{ padding: 40 }}>
          <Pressable testID="p" hitSlop={{ top: 10, left: 20 }} style={{ width: 40, height: 40 }} />
        </View>,
      )
      const element = byTestId('p')
      const rect = element.getBoundingClientRect()
      expect(document.elementFromPoint(rect.left - 15, rect.top + 20)).toBe(element)
      expect(document.elementFromPoint(rect.left - 25, rect.top + 20)).not.toBe(element)
      expect(document.elementFromPoint(rect.left + 20, rect.top - 5)).toBe(element)
      expect(document.elementFromPoint(rect.right + 5, rect.top + 20)).not.toBe(element)
    })

    test('a press in the hit area calls onPress', async () => {
      const onPress = vi.fn()
      render(
        <View style={{ padding: 40 }}>
          <Pressable testID="p" hitSlop={20} style={{ width: 40, height: 40 }} onPress={onPress} />
        </View>,
      )
      await user(() => userEvent.click(byTestId('p'), { position: { x: -10, y: 20 } }))
      expect(onPress).toHaveBeenCalledTimes(1)
    })

    test('stays under the children', () => {
      // A View child has a z-index, so it paints above the hit area anyway. A raw DOM child
      // has none.
      render(
        <Pressable testID="p" hitSlop={20} style={{ width: 40, height: 40 }}>
          <span data-testid="child" style={{ width: 20, height: 20 }} />
        </Pressable>,
      )
      const child = byTestId('child')
      const rect = child.getBoundingClientRect()
      expect(document.elementFromPoint(rect.left + 5, rect.top + 5)).toBe(child)
    })
  })

  test('cancelable false sets touch-action none', () => {
    render(
      <>
        <Pressable testID="a" />
        <Pressable testID="b" cancelable={false} />
      </>,
    )
    expect(getComputedStyle(byTestId('a')).touchAction).toBe('auto')
    expect(getComputedStyle(byTestId('b')).touchAction).toBe('none')
  })

  test('a button role renders a button that does not submit its form', async () => {
    const onSubmit = vi.fn()
    const onPress = vi.fn()
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <Pressable testID="p" role="button" onPress={onPress}>
          <Text>Go</Text>
        </Pressable>
      </form>,
    )
    const element = byTestId('p') as HTMLButtonElement
    expect(element.tagName).toBe('BUTTON')
    expect(element.type).toBe('button')
    await user(() => userEvent.click(element))
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  test('disabled: no press, aria-disabled, and out of the tab order', async () => {
    const onPress = vi.fn()
    render(<Pressable testID="p" style={box} disabled onPress={onPress} />)
    const element = byTestId('p')
    expect(element.getAttribute('aria-disabled')).toBe('true')
    expect(element.tabIndex).toBe(-1)
    await user(() => userEvent.click(element))
    expect(onPress).not.toHaveBeenCalled()
  })

  test('app DOM handlers run next to the press handlers', async () => {
    const onPointerDown = vi.fn()
    const onKeyDown = vi.fn()
    const onPress = vi.fn()
    render(
      <Pressable
        testID="p"
        style={box}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        onPress={onPress}
      />,
    )
    const element = byTestId('p')
    await user(() => userEvent.click(element))
    expect(onPointerDown).toHaveBeenCalledTimes(1)
    expect(onPress).toHaveBeenCalledTimes(1)

    act(() => element.focus())
    await user(() => userEvent.keyboard('{Enter}'))
    expect(onKeyDown).toHaveBeenCalledTimes(1)
    expect(onPress).toHaveBeenCalledTimes(2)
  })

  test('onFocus and onBlur get the focus events', () => {
    const onFocus = vi.fn()
    const onBlur = vi.fn()
    render(<Pressable testID="p" onFocus={onFocus} onBlur={onBlur} />)
    const element = byTestId('p')
    act(() => element.focus())
    act(() => element.blur())
    expect(onFocus).toHaveBeenCalledTimes(1)
    expect(onBlur).toHaveBeenCalledTimes(1)
  })

  test('Android props do not reach the DOM', () => {
    render(
      <Pressable
        testID="p"
        android_ripple={{ color: 'red' }}
        android_disableSound
        blockNativeResponder
      />,
    )
    expect(byTestId('p').outerHTML).not.toMatch(/android|ripple|responder/i)
  })
})

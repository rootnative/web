import { useEffect, type ReactElement, type ReactNode } from 'react'
import { afterEach, describe, expect, onTestFinished, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { View } from '../../components/View'
import type { Role } from '../../components/View'
import { cleanup, render } from '../../test/render'
import type { GestureResponderEvent } from '../types'
import type { PressabilityConfig } from './types'
import { usePressability } from './usePressability'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

type TargetProps = {
  config: PressabilityConfig
  testID?: string
  role?: Role
  href?: string
  children?: ReactNode
}

function Target({ config, testID = 'target', role, href, children }: TargetProps): ReactElement {
  const handlers = usePressability(config)
  return (
    <View
      testID={testID}
      role={role}
      href={href}
      focusable
      style={{ width: 100, height: 100 }}
      {...handlers}
    >
      {children}
    </View>
  )
}

const byTestId = (id = 'target'): HTMLElement =>
  document.querySelector(`[data-testid="${id}"]`) as HTMLElement

// A synthetic pointer at (x, y) from the top-left corner of the element.
const pointer = (
  element: Element,
  type: string,
  x = 10,
  y = 10,
  pointerType: 'mouse' | 'touch' = 'touch',
): void => {
  const rect = element.getBoundingClientRect()
  element.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: 1,
      pointerType,
      isPrimary: true,
      button: 0,
      clientX: rect.left + x,
      clientY: rect.top + y,
    }),
  )
}

const key = (element: Element, type: 'keydown' | 'keyup', name: string, repeat = false): void => {
  element.dispatchEvent(
    new KeyboardEvent(type, { key: name, bubbles: true, cancelable: true, repeat }),
  )
}

const recordEvents = <K extends keyof DocumentEventMap>(type: K): DocumentEventMap[K][] => {
  const events: DocumentEventMap[K][] = []
  const listener = (event: DocumentEventMap[K]): void => {
    events.push(event)
  }
  document.addEventListener(type, listener)
  onTestFinished(() => document.removeEventListener(type, listener))
  return events
}

const logConfig = (log: string[]): PressabilityConfig => ({
  minPressDuration: 0,
  onPressIn: () => log.push('in'),
  onPressOut: () => log.push('out'),
  onPress: () => log.push('press'),
})

describe('usePressability', () => {
  test('returns null without a config, then the same handlers on every render', () => {
    const seen: unknown[] = []
    function Probe(props: { config: PressabilityConfig | null }): null {
      const handlers = usePressability(props.config)
      useEffect(() => {
        seen.push(handlers)
      })
      return null
    }
    const { rerender } = render(<Probe config={null} />)
    rerender(<Probe config={{ onPress: () => {} }} />)
    rerender(<Probe config={{ onPress: () => {} }} />)
    expect(seen).toHaveLength(3)
    expect(seen[0]).toBeNull()
    expect(seen[1]).toEqual(expect.objectContaining({ onPointerDown: expect.any(Function) }))
    expect(seen[2]).toBe(seen[1])
  })

  describe('pointer', () => {
    test('a click presses in, presses out, then presses once', async () => {
      const log: string[] = []
      render(<Target config={logConfig(log)} />)
      await userEvent.click(byTestId())
      expect(log).toEqual(['in', 'out', 'press'])
    })

    test('onPress gets the pointerup event with the touch fields', async () => {
      let seen: Record<string, unknown> = {}
      const onPress = (event: GestureResponderEvent): void => {
        const native = event.nativeEvent as GestureResponderEvent['nativeEvent'] & PointerEvent
        seen = {
          type: event.type,
          currentTarget: event.currentTarget,
          pointerType: native.pointerType,
          locationX: native.locationX,
          locationY: native.locationY,
          timestamp: native.timestamp,
          touches: native.touches.length,
          changedTouches: native.changedTouches.length,
        }
      }
      render(<Target config={{ onPress }} />)
      const element = byTestId()
      await userEvent.click(element)

      expect(seen['type']).toBe('pointerup')
      expect(seen['currentTarget']).toBe(element)
      expect(seen['pointerType']).toBe('mouse')
      expect(seen['locationX']).toBeCloseTo(50, -1)
      expect(seen['locationY']).toBeCloseTo(50, -1)
      expect(typeof seen['timestamp']).toBe('number')
      expect(seen['touches']).toBe(0)
      expect(seen['changedTouches']).toBe(1)
    })

    test('holds onPressOut for the minimum press duration', () => {
      const onPressOut = vi.fn()
      render(<Target config={{ onPressOut }} />)
      vi.useFakeTimers()
      const element = byTestId()
      pointer(element, 'pointerdown')
      pointer(element, 'pointerup')
      vi.advanceTimersByTime(129)
      expect(onPressOut).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(onPressOut).toHaveBeenCalledTimes(1)
    })

    test('a release before delayPressIn ends still presses in and out', () => {
      const log: string[] = []
      render(<Target config={{ ...logConfig(log), minPressDuration: 130, delayPressIn: 100 }} />)
      vi.useFakeTimers()
      const element = byTestId()
      pointer(element, 'pointerdown')
      vi.advanceTimersByTime(50)
      expect(log).toEqual([])
      pointer(element, 'pointerup')
      expect(log).toEqual(['in', 'press'])
      vi.advanceTimersByTime(130)
      expect(log).toEqual(['in', 'press', 'out'])
    })

    test('pointercancel ends the press without onPress', () => {
      const log: string[] = []
      render(<Target config={logConfig(log)} />)
      const element = byTestId()
      pointer(element, 'pointerdown')
      pointer(element, 'pointercancel')
      expect(log).toEqual(['in', 'out'])
    })
  })

  describe('long press', () => {
    test('calls onLongPress after 500 ms and skips onPress', () => {
      const onLongPress = vi.fn()
      const onPress = vi.fn()
      const onPressOut = vi.fn()
      render(<Target config={{ onLongPress, onPress, onPressOut }} />)
      vi.useFakeTimers()
      const element = byTestId()
      pointer(element, 'pointerdown')
      vi.advanceTimersByTime(499)
      expect(onLongPress).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(onLongPress).toHaveBeenCalledTimes(1)
      pointer(element, 'pointerup')
      expect(onPressOut).toHaveBeenCalledTimes(1)
      expect(onPress).not.toHaveBeenCalled()
    })

    test('without onLongPress, a long press still presses', () => {
      const onPress = vi.fn()
      render(<Target config={{ onPress }} />)
      vi.useFakeTimers()
      const element = byTestId()
      pointer(element, 'pointerdown')
      vi.advanceTimersByTime(1000)
      pointer(element, 'pointerup')
      expect(onPress).toHaveBeenCalledTimes(1)
    })

    test('delayLongPress sets the delay', () => {
      const onLongPress = vi.fn()
      render(<Target config={{ onLongPress, delayLongPress: 1000 }} />)
      vi.useFakeTimers()
      pointer(byTestId(), 'pointerdown')
      vi.advanceTimersByTime(999)
      expect(onLongPress).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(onLongPress).toHaveBeenCalledTimes(1)
    })

    test('a move of more than 10 px cancels it', () => {
      const onLongPress = vi.fn()
      const onPress = vi.fn()
      render(<Target config={{ onLongPress, onPress }} />)
      vi.useFakeTimers()
      const element = byTestId()
      pointer(element, 'pointerdown', 10, 10)
      pointer(element, 'pointermove', 25, 10)
      vi.advanceTimersByTime(1000)
      expect(onLongPress).not.toHaveBeenCalled()
      pointer(element, 'pointerup', 25, 10)
      expect(onPress).toHaveBeenCalledTimes(1)
    })

    test('cancels the click, so a link does not navigate', async () => {
      const clicks = recordEvents('click')
      const onLongPress = vi.fn()
      const onPress = vi.fn()
      render(
        <Target
          role="link"
          href="#long-press"
          config={{ onLongPress, onPress, delayLongPress: 100 }}
        />,
      )
      await userEvent.click(byTestId(), { delay: 250 })
      expect(onLongPress).toHaveBeenCalledTimes(1)
      expect(onPress).not.toHaveBeenCalled()
      expect(clicks).toHaveLength(1)
      expect(clicks[0]?.defaultPrevented).toBe(true)
      expect(location.hash).not.toBe('#long-press')
    })

    test('blocks the context menu of a touch press', () => {
      render(<Target config={{ onLongPress: vi.fn() }} />)
      const element = byTestId()
      pointer(element, 'pointerdown')
      const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
      element.dispatchEvent(menu)
      expect(menu.defaultPrevented).toBe(true)
    })
  })

  describe('press rect', () => {
    test('leaving it presses out, and a release outside does not press', () => {
      const log: string[] = []
      render(<Target config={logConfig(log)} />)
      const element = byTestId()
      pointer(element, 'pointerdown')
      pointer(element, 'pointermove', 130, 10)
      expect(log).toEqual(['in', 'out'])
      pointer(element, 'pointerup', 130, 10)
      expect(log).toEqual(['in', 'out'])
    })

    test('coming back presses in again', () => {
      const log: string[] = []
      render(<Target config={logConfig(log)} />)
      const element = byTestId()
      pointer(element, 'pointerdown')
      pointer(element, 'pointermove', 130, 10)
      pointer(element, 'pointermove', 50, 50)
      pointer(element, 'pointerup', 50, 50)
      expect(log).toEqual(['in', 'out', 'in', 'out', 'press'])
    })

    test('a release inside the retention offset presses', () => {
      const onPress = vi.fn()
      render(<Target config={{ onPress }} />)
      const element = byTestId()
      pointer(element, 'pointerdown')
      pointer(element, 'pointermove', 115, 10)
      pointer(element, 'pointerup', 115, 10)
      expect(onPress).toHaveBeenCalledTimes(1)
    })

    test('pressRectOffset and hitSlop change the retention area', () => {
      const onPress = vi.fn()
      render(<Target config={{ onPress, pressRectOffset: 0, hitSlop: { right: 5 } }} />)
      const element = byTestId()
      pointer(element, 'pointerdown')
      pointer(element, 'pointermove', 108, 10)
      pointer(element, 'pointerup', 108, 10)
      expect(onPress).not.toHaveBeenCalled()
    })
  })

  describe('click', () => {
    test('preventDefault in onPress cancels the click', async () => {
      const clicks = recordEvents('click')
      render(
        <Target role="link" href="#pressability" config={{ onPress: (e) => e.preventDefault() }} />,
      )
      const element = byTestId()
      expect(element.tagName).toBe('A')
      await userEvent.click(element)
      expect(clicks).toHaveLength(1)
      expect(clicks[0]?.defaultPrevented).toBe(true)
      expect(location.hash).not.toBe('#pressability')
    })

    test('element.click() presses, from a child too', () => {
      const onPress = vi.fn()
      render(
        <Target config={{ onPress }}>
          <View testID="child" style={{ height: 10 }} />
        </Target>,
      )
      byTestId().click()
      byTestId('child').click()
      expect(onPress).toHaveBeenCalledTimes(2)
    })

    test('a disabled pressable ignores element.click()', () => {
      const onPress = vi.fn()
      render(<Target config={{ onPress, disabled: true }} />)
      byTestId().click()
      expect(onPress).not.toHaveBeenCalled()
    })
  })

  describe('keyboard', () => {
    test('Enter and Space press a focusable view', async () => {
      const keydowns = recordEvents('keydown')
      const log: string[] = []
      render(<Target config={logConfig(log)} />)
      byTestId().focus()
      await userEvent.keyboard('{Enter}')
      expect(log).toEqual(['in', 'out', 'press'])
      await userEvent.keyboard(' ')
      expect(log).toEqual(['in', 'out', 'press', 'in', 'out', 'press'])
      expect(keydowns.at(-1)?.defaultPrevented).toBe(true)
    })

    test('a held key presses once', () => {
      const log: string[] = []
      render(<Target config={logConfig(log)} />)
      const element = byTestId()
      element.focus()
      key(element, 'keydown', 'Enter')
      key(element, 'keydown', 'Enter', true)
      key(element, 'keyup', 'Enter')
      expect(log).toEqual(['in', 'out', 'press'])
    })

    test('blur ends a key press without onPress', () => {
      const log: string[] = []
      render(<Target config={logConfig(log)} />)
      const element = byTestId()
      element.focus()
      key(element, 'keydown', ' ')
      element.blur()
      key(element, 'keyup', ' ')
      expect(log).toEqual(['in', 'out'])
    })

    test('a native button presses once, through its click', async () => {
      const onPress = vi.fn()
      const onPressIn = vi.fn()
      render(<Target role="button" config={{ onPress, onPressIn }} />)
      const element = byTestId()
      expect(element.tagName).toBe('BUTTON')
      element.focus()
      await userEvent.keyboard('{Enter}')
      expect(onPress).toHaveBeenCalledTimes(1)
      expect(onPressIn).not.toHaveBeenCalled()
    })

    test('a key on a child does not press', () => {
      const onPress = vi.fn()
      render(
        <Target config={{ onPress }}>
          <View testID="child" focusable style={{ height: 10 }} />
        </Target>,
      )
      const child = byTestId('child')
      child.focus()
      key(child, 'keydown', 'Enter')
      key(child, 'keyup', 'Enter')
      expect(onPress).not.toHaveBeenCalled()
    })
  })

  describe('nesting', () => {
    test('the innermost pressable takes the press', async () => {
      const outer = vi.fn()
      const inner = vi.fn()
      render(
        <Target testID="outer" config={{ onPress: outer }}>
          <Target testID="inner" config={{ onPress: inner }} />
        </Target>,
      )
      await userEvent.click(byTestId('inner'))
      expect(inner).toHaveBeenCalledTimes(1)
      expect(outer).not.toHaveBeenCalled()
    })

    test('a disabled pressable passes the press to its parent', async () => {
      const outer = vi.fn()
      const inner = vi.fn()
      render(
        <Target testID="outer" config={{ onPress: outer }}>
          <Target testID="inner" config={{ onPress: inner, disabled: true }} />
        </Target>,
      )
      await userEvent.click(byTestId('inner'))
      expect(inner).not.toHaveBeenCalled()
      expect(outer).toHaveBeenCalledTimes(1)
    })

    test('a native control inside keeps its own press', async () => {
      const onPress = vi.fn()
      render(
        <Target config={{ onPress }}>
          <input data-testid="field" />
        </Target>,
      )
      const field = byTestId('field')
      await userEvent.click(field)
      expect(onPress).not.toHaveBeenCalled()
      expect(document.activeElement).toBe(field)
    })
  })

  describe('hover', () => {
    test('calls onHoverIn and onHoverOut', async () => {
      const onHoverIn = vi.fn()
      const onHoverOut = vi.fn()
      render(<Target config={{ onHoverIn, onHoverOut }} />)
      const element = byTestId()
      await userEvent.unhover(element)
      onHoverIn.mockClear()
      onHoverOut.mockClear()

      await userEvent.hover(element)
      expect(onHoverIn).toHaveBeenCalledTimes(1)
      await userEvent.unhover(element)
      expect(onHoverOut).toHaveBeenCalledTimes(1)
    })

    test('ignores a touch pointer', () => {
      const onHoverIn = vi.fn()
      render(<Target config={{ onHoverIn }} />)
      pointer(byTestId(), 'pointerover', 10, 10, 'touch')
      expect(onHoverIn).not.toHaveBeenCalled()
      pointer(byTestId(), 'pointerover', 10, 10, 'mouse')
      expect(onHoverIn).toHaveBeenCalledTimes(1)
    })
  })

  describe('lifecycle', () => {
    test('unmount clears a pending long press', () => {
      const onLongPress = vi.fn()
      const { unmount } = render(<Target config={{ onLongPress }} />)
      vi.useFakeTimers()
      pointer(byTestId(), 'pointerdown')
      unmount()
      vi.advanceTimersByTime(1000)
      expect(onLongPress).not.toHaveBeenCalled()
    })

    test('a new config applies to the next press', () => {
      const first = vi.fn()
      const second = vi.fn()
      const { rerender } = render(<Target config={{ onPress: first }} />)
      rerender(<Target config={{ onPress: second }} />)
      byTestId().click()
      expect(first).not.toHaveBeenCalled()
      expect(second).toHaveBeenCalledTimes(1)
    })
  })
})

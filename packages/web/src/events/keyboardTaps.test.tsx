import type { CDPSession } from '@vitest/browser-playwright'
import { act, type ReactElement, type ReactNode } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { cdp, server } from 'vitest/browser'

import { Pressable } from '../components/Pressable'
import { ScrollView } from '../components/ScrollView'
import { TextInput } from '../components/TextInput'
import { View } from '../components/View'
import { cleanup, render } from '../test/render'

afterEach(cleanup)

// A tap as a browser sends it: the pointer events, then the `mousedown` that moves the focus.
// Returns that `mousedown`.
const tap = (target: Element, pointerType: 'touch' | 'mouse' = 'touch'): MouseEvent => {
  const pointer = { bubbles: true, cancelable: true, pointerId: 9, isPrimary: true, pointerType }
  const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  act(() => {
    target.dispatchEvent(new PointerEvent('pointerdown', pointer))
    target.dispatchEvent(new PointerEvent('pointerup', pointer))
    target.dispatchEvent(down)
  })
  return down
}

const byTestId = (container: HTMLElement, id: string): HTMLElement =>
  container.querySelector(`[data-testid="${id}"]`) as HTMLElement

// A focused field and, below it, a plain view and a pressable.
function Screen({
  wrap,
}: {
  wrap?: ((children: ReactNode) => ReactElement) | undefined
}): ReactElement {
  const content = (
    <>
      <View testID="plain" style={{ height: 40 }} />
      <Pressable testID="button" onPress={() => {}} style={{ height: 40 }} />
      <TextInput testID="other" />
    </>
  )
  return (
    <View>
      <TextInput testID="field" />
      {wrap === undefined ? content : wrap(content)}
    </View>
  )
}

const renderFocused = (wrap?: (children: ReactNode) => ReactElement): HTMLElement => {
  const { container } = render(<Screen wrap={wrap} />)
  act(() => byTestId(container, 'field').focus())
  return container
}

describe('a tap outside the focused text field', () => {
  test('keeps the focus outside a ScrollView, as on native', () => {
    const container = renderFocused()
    expect(tap(byTestId(container, 'plain')).defaultPrevented).toBe(true)
    expect(tap(byTestId(container, 'button')).defaultPrevented).toBe(true)
  })

  test('keeps the browser rule for a mouse click', () => {
    const container = renderFocused()
    expect(tap(byTestId(container, 'button'), 'mouse').defaultPrevented).toBe(false)
  })

  test('moves the focus to another text field', () => {
    const container = renderFocused()
    expect(tap(byTestId(container, 'other')).defaultPrevented).toBe(false)
  })

  test('does nothing while no text field has the focus', () => {
    const container = renderFocused()
    act(() => byTestId(container, 'field').blur())
    expect(tap(byTestId(container, 'button')).defaultPrevented).toBe(false)
  })

  test("lets a ScrollView with the default 'never' blur the field", () => {
    const container = renderFocused((children) => <ScrollView>{children}</ScrollView>)
    expect(tap(byTestId(container, 'plain')).defaultPrevented).toBe(false)
    expect(tap(byTestId(container, 'button')).defaultPrevented).toBe(false)
  })

  test.each(['always', true] as const)('keeps the focus in a ScrollView with %s', (value) => {
    const container = renderFocused((children) => (
      <ScrollView keyboardShouldPersistTaps={value}>{children}</ScrollView>
    ))
    expect(tap(byTestId(container, 'plain')).defaultPrevented).toBe(true)
  })

  test("keeps the focus in a 'handled' ScrollView only for a tap that a pressable takes", () => {
    const container = renderFocused((children) => (
      <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
    ))
    expect(tap(byTestId(container, 'button')).defaultPrevented).toBe(true)
    expect(tap(byTestId(container, 'plain')).defaultPrevented).toBe(false)
  })

  test("an outer 'never' ScrollView wins over an inner 'handled' one", () => {
    const container = renderFocused((children) => (
      <ScrollView>
        <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </ScrollView>
    ))
    expect(tap(byTestId(container, 'button')).defaultPrevented).toBe(false)
  })

  // Real touch input, so Chromium moves the focus by its own rules.
  describe.runIf(server.browser === 'chromium')('with real touch input in Chromium', () => {
    test('a press keeps the focus in the field, and the press fires', async () => {
      const onPress = vi.fn()
      const { container } = render(
        <View>
          <TextInput testID="field" style={{ height: 40 }} />
          <Pressable testID="button" onPress={onPress} style={{ height: 40 }} />
        </View>,
      )
      // CDP takes the point in the page of the test runner, which holds this page in a frame.
      const frame = window.frameElement?.getBoundingClientRect() ?? { left: 0, top: 0 }
      const session: CDPSession = cdp()
      const tapAt = async (element: HTMLElement): Promise<void> => {
        const rect = element.getBoundingClientRect()
        const point = { x: frame.left + rect.left + 10, y: frame.top + rect.top + 10 }
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      }

      const field = byTestId(container, 'field')
      await tapAt(field)
      await expect.poll(() => document.activeElement).toBe(field)
      await tapAt(byTestId(container, 'button'))
      await expect.poll(() => onPress.mock.calls.length).toBe(1)
      expect(document.activeElement).toBe(field)
    })
  })
})

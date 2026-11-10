import { act } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { cleanup, render } from '../../test/render'
import { Text } from '../Text'
import { View } from '../View'
import { TouchableWithoutFeedback } from './index'

afterEach(cleanup)

const box = { width: 100, height: 100 }

const byTestId = (id: string): HTMLElement =>
  document.querySelector(`[data-testid="${id}"]`) as HTMLElement

const user = async (action: () => Promise<void>): Promise<void> => {
  await act(action)
}

describe('TouchableWithoutFeedback', () => {
  test('renders only its child, and the child takes the press', async () => {
    const onPressIn = vi.fn()
    const onPress = vi.fn()
    const onPressOut = vi.fn()
    const { container } = render(
      <TouchableWithoutFeedback onPressIn={onPressIn} onPress={onPress} onPressOut={onPressOut}>
        <View testID="child" style={box} />
      </TouchableWithoutFeedback>,
    )
    expect(container.firstElementChild).toBe(byTestId('child'))
    await user(() => userEvent.click(byTestId('child')))
    // No minimum press duration, as in React Native.
    expect(onPressIn).toHaveBeenCalledTimes(1)
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(onPressOut).toHaveBeenCalledTimes(1)
  })

  test('the child is focusable only with onPress, and Enter presses it', async () => {
    const onPress = vi.fn()
    render(
      <>
        <TouchableWithoutFeedback onPress={onPress}>
          <View testID="press" style={box} />
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback onLongPress={() => {}}>
          <View testID="long" style={box} />
        </TouchableWithoutFeedback>
      </>,
    )
    expect(byTestId('press').tabIndex).toBe(0)
    expect(byTestId('long').tabIndex).toBe(-1)
    act(() => byTestId('press').focus())
    await user(() => userEvent.keyboard('{Enter}'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test('disabled: no press, aria-disabled, and out of the tab order', async () => {
    const onPress = vi.fn()
    render(
      <TouchableWithoutFeedback onPress={onPress} disabled>
        <View testID="child" style={box} />
      </TouchableWithoutFeedback>,
    )
    const child = byTestId('child')
    expect(child.getAttribute('aria-disabled')).toBe('true')
    expect(child.tabIndex).toBe(-1)
    await user(() => userEvent.click(child))
    expect(onPress).not.toHaveBeenCalled()
  })

  test('gives the child its accessibility props and testID, but not its style', () => {
    render(
      <TouchableWithoutFeedback
        onPress={() => {}}
        testID="touchable"
        role="button"
        accessibilityLabel="Save"
        style={{ opacity: 0.5 }}
      >
        <View style={box} />
      </TouchableWithoutFeedback>,
    )
    const child = byTestId('touchable')
    expect(child.tagName).toBe('BUTTON')
    expect(child.getAttribute('aria-label')).toBe('Save')
    expect(getComputedStyle(child).opacity).toBe('1')
  })

  test("the child's own DOM handlers run first", async () => {
    const calls: string[] = []
    render(
      <TouchableWithoutFeedback onPress={() => calls.push('press')}>
        <View testID="child" style={box} onPointerDown={() => calls.push('pointerdown')} />
      </TouchableWithoutFeedback>,
    )
    await user(() => userEvent.click(byTestId('child')))
    expect(calls).toEqual(['pointerdown', 'press'])
  })

  test("onFocus and onBlur replace the child's", () => {
    const own = vi.fn()
    const child = vi.fn()
    render(
      <>
        <TouchableWithoutFeedback onPress={() => {}} onFocus={own}>
          <View testID="replaced" onFocus={child} />
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback onPress={() => {}}>
          <View testID="kept" onFocus={child} />
        </TouchableWithoutFeedback>
      </>,
    )
    act(() => byTestId('replaced').focus())
    act(() => byTestId('kept').focus())
    expect(own).toHaveBeenCalledTimes(1)
    expect(child).toHaveBeenCalledTimes(1)
  })

  test('works with a Text child', async () => {
    const onPress = vi.fn()
    render(
      <TouchableWithoutFeedback onPress={onPress}>
        <Text testID="label">Tap</Text>
      </TouchableWithoutFeedback>,
    )
    await user(() => userEvent.click(byTestId('label')))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})

import { act } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { processColor } from '../../apis/processColor'
import { cleanup, render } from '../../test/render'
import { View } from '../View'
import { TouchableNativeFeedback } from './index'

afterEach(cleanup)

const box = { width: 100, height: 100 }

const byTestId = (id: string): HTMLElement =>
  document.querySelector(`[data-testid="${id}"]`) as HTMLElement

const user = async (action: () => Promise<void>): Promise<void> => {
  await act(action)
}

describe('TouchableNativeFeedback', () => {
  test('renders only its child, which takes the press, as on iOS', async () => {
    const onPressIn = vi.fn()
    const onPress = vi.fn()
    const { container } = render(
      <TouchableNativeFeedback onPressIn={onPressIn} onPress={onPress}>
        <View testID="child" style={box} />
      </TouchableNativeFeedback>,
    )
    expect(container.firstElementChild).toBe(byTestId('child'))
    expect(byTestId('child').tabIndex).toBe(0)
    await user(() => userEvent.click(byTestId('child')))
    expect(onPressIn).toHaveBeenCalledTimes(1)
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test('the Android and TV props do not reach the DOM', () => {
    render(
      <TouchableNativeFeedback
        onPress={() => {}}
        background={TouchableNativeFeedback.Ripple('red', true)}
        useForeground
        hasTVPreferredFocus
        nextFocusDown={1}
      >
        <View testID="child" style={box} />
      </TouchableNativeFeedback>,
    )
    const child = byTestId('child')
    for (const name of ['background', 'useforeground', 'hastvpreferredfocus', 'nextfocusdown']) {
      expect(child.hasAttribute(name)).toBe(false)
    }
  })

  test('the background helpers return the shapes of React Native', () => {
    expect(TouchableNativeFeedback.SelectableBackground(12)).toEqual({
      type: 'ThemeAttrAndroid',
      attribute: 'selectableItemBackground',
      rippleRadius: 12,
    })
    expect(TouchableNativeFeedback.SelectableBackgroundBorderless()).toEqual({
      type: 'ThemeAttrAndroid',
      attribute: 'selectableItemBackgroundBorderless',
      rippleRadius: undefined,
    })
    expect(TouchableNativeFeedback.Ripple('red', false, 4)).toEqual({
      type: 'RippleAndroid',
      color: processColor('red'),
      borderless: false,
      rippleRadius: 4,
    })
  })

  test('canUseNativeForeground is false', () => {
    expect(TouchableNativeFeedback.canUseNativeForeground()).toBe(false)
  })
})

import { act, createRef } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { Keyboard } from '../../apis/Keyboard'
import { nextFrame, stubKeyboard, type KeyboardStub } from '../../test/keyboard'
import { cleanup, render } from '../../test/render'
import { View } from '../View'
import { KeyboardAvoidingView, type KeyboardAvoidingViewProps } from './index'
import type { HostInstance } from '../View/types'

const root = document.documentElement
let stub: KeyboardStub

beforeEach(() => {
  stub = stubKeyboard()
})

afterEach(() => {
  cleanup()
  Keyboard.removeAllListeners()
  stub.restore()
})

// A full-height view at the top of a positioned box, so its onLayout `y` is 0.
const renderView = (props: KeyboardAvoidingViewProps = {}) => {
  const ref = createRef<HostInstance>()
  const rendered = render(
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: root.clientHeight }}>
      <KeyboardAvoidingView ref={ref} style={{ flex: 1 }} {...props}>
        <input type="text" data-testid="field" />
      </KeyboardAvoidingView>
    </View>,
  )
  const field = rendered.container.querySelector('input') as HTMLInputElement
  return { ...rendered, ref, field }
}

const settle = async (): Promise<void> => {
  await act(async () => {
    await nextFrame()
    await nextFrame()
  })
}

const showKeyboard = async (field: HTMLInputElement, height: number): Promise<void> => {
  field.focus()
  stub.setKeyboard(height)
  await settle()
}

describe('KeyboardAvoidingView', () => {
  test('pads its bottom by the overlap with the keyboard, and back to 0', async () => {
    const { ref, field } = renderView({ behavior: 'padding' })
    await settle()
    expect(getComputedStyle(ref.current as HTMLElement).paddingBottom).toBe('0px')

    await showKeyboard(field, 300)
    expect(getComputedStyle(ref.current as HTMLElement).paddingBottom).toBe('300px')

    stub.setKeyboard(0)
    await settle()
    expect(getComputedStyle(ref.current as HTMLElement).paddingBottom).toBe('0px')
  })

  test('adds keyboardVerticalOffset to the overlap, as on native', async () => {
    const { ref, field } = renderView({ behavior: 'padding', keyboardVerticalOffset: 56 })
    await settle()
    await showKeyboard(field, 300)
    expect(getComputedStyle(ref.current as HTMLElement).paddingBottom).toBe('356px')
  })

  test('shrinks its height with the height behavior, and gets it back', async () => {
    const { ref, field } = renderView({ behavior: 'height' })
    await settle()
    const element = ref.current as HTMLElement
    expect(element.offsetHeight).toBe(root.clientHeight)

    await showKeyboard(field, 300)
    expect(element.offsetHeight).toBe(root.clientHeight - 300)
    expect(getComputedStyle(element).flexGrow).toBe('0')

    stub.setKeyboard(0)
    await settle()
    expect(element.offsetHeight).toBe(root.clientHeight)
  })

  test('moves an inner view up with the position behavior', async () => {
    const { ref, field } = renderView({
      behavior: 'position',
      contentContainerStyle: { backgroundColor: 'red' },
    })
    await settle()
    await showKeyboard(field, 300)
    const inner = (ref.current as HTMLElement).firstElementChild as HTMLElement
    const computed = getComputedStyle(inner)
    expect(computed.bottom).toBe('300px')
    expect(computed.backgroundColor).toBe('rgb(255, 0, 0)')
  })

  test('does nothing with no behavior', async () => {
    const { ref, field } = renderView()
    await settle()
    await showKeyboard(field, 300)
    const computed = getComputedStyle(ref.current as HTMLElement)
    expect(computed.paddingBottom).toBe('0px')
    expect((ref.current as HTMLElement).offsetHeight).toBe(root.clientHeight)
  })

  test('stays put while disabled, and moves when enabled again', async () => {
    const { ref, field, rerender } = renderView({ behavior: 'padding', enabled: false })
    await settle()
    await showKeyboard(field, 300)
    expect(getComputedStyle(ref.current as HTMLElement).paddingBottom).toBe('0px')

    rerender(
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: root.clientHeight }}>
        <KeyboardAvoidingView ref={ref} style={{ flex: 1 }} behavior="padding">
          <input type="text" />
        </KeyboardAvoidingView>
      </View>,
    )
    await settle()
    expect(getComputedStyle(ref.current as HTMLElement).paddingBottom).toBe('300px')
  })

  test('calls its own onLayout', async () => {
    const onLayout = vi.fn()
    renderView({ onLayout })
    await settle()
    expect(onLayout).toHaveBeenCalledWith({
      nativeEvent: { layout: { x: 0, y: 0, width: root.clientWidth, height: root.clientHeight } },
    })
  })

  test('stops listening when it unmounts', async () => {
    const { unmount } = renderView({ behavior: 'padding' })
    await settle()
    expect(stub.listenerCount()).toBe(2)
    unmount()
    expect(stub.listenerCount()).toBe(0)
  })
})

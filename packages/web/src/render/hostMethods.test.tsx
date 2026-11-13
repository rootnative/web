import { createRef, type ReactElement, type Ref } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { Image } from '../components/Image'
import { Pressable } from '../components/Pressable'
import { ScrollView, type ScrollViewInstance } from '../components/ScrollView'
import { Text } from '../components/Text'
import { TextInput, type TextInputInstance } from '../components/TextInput'
import { TouchableOpacity } from '../components/TouchableOpacity'
import { View } from '../components/View'
import type { HostInstance } from '../components/View/types'
import { cleanup, render } from '../test/render'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// An outer box at (30, 40) in the window, and an inner box at (10, 5) inside it.
const Boxes = ({
  outer,
  inner,
}: {
  outer?: Ref<HostInstance>
  inner: Ref<HostInstance>
}): ReactElement => (
  <View ref={outer} style={{ position: 'absolute', left: 30, top: 40, width: 200, height: 100 }}>
    <View ref={inner} style={{ marginLeft: 10, marginTop: 5, width: 50, height: 20 }} />
  </View>
)

describe('host methods', () => {
  test('measureInWindow gives the box in window coordinates', () => {
    const inner = createRef<HostInstance>()
    render(<Boxes inner={inner} />)
    const callback = vi.fn()
    inner.current?.measureInWindow(callback)
    expect(callback).toHaveBeenCalledWith(40, 45, 50, 20)
  })

  test('measure gives the position in the parent, the size, and the position in the window', () => {
    const inner = createRef<HostInstance>()
    render(<Boxes inner={inner} />)
    const callback = vi.fn()
    inner.current?.measure(callback)
    expect(callback).toHaveBeenCalledWith(10, 5, 50, 20, 40, 45)
  })

  test('measureLayout gives the position in an ancestor', () => {
    const outer = createRef<HostInstance>()
    const inner = createRef<HostInstance>()
    render(<Boxes outer={outer} inner={inner} />)
    const onSuccess = vi.fn()
    const onFail = vi.fn()
    inner.current?.measureLayout(outer.current as HostInstance, onSuccess, onFail)
    expect(onSuccess).toHaveBeenCalledWith(10, 5, 50, 20)
    expect(onFail).not.toHaveBeenCalled()
  })

  test('measureLayout fails when the other node is not an ancestor', () => {
    const outer = createRef<HostInstance>()
    const inner = createRef<HostInstance>()
    render(<Boxes outer={outer} inner={inner} />)
    const onSuccess = vi.fn()
    const onFail = vi.fn()
    outer.current?.measureLayout(inner.current as HostInstance, onSuccess, onFail)
    outer.current?.measureLayout(7, onSuccess, onFail)
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onFail).toHaveBeenCalledTimes(2)
  })

  test('setNativeProps writes a style that beats the style prop', () => {
    const ref = createRef<HostInstance>()
    render(<View ref={ref} style={{ opacity: 1, width: 10 }} />)
    ref.current?.setNativeProps({ style: [{ opacity: 0.5 }, { width: 24 }] })
    const computed = getComputedStyle(ref.current as HTMLElement)
    expect(computed.opacity).toBe('0.5')
    expect(computed.width).toBe('24px')
  })

  test('setNativeProps warns for a prop that is not style', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const ref = createRef<HostInstance>()
    render(<View ref={ref} />)
    ref.current?.setNativeProps({ hostMethodsTestProp: true })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('hostMethodsTestProp'))
  })

  test('the ref of each host component has the methods', () => {
    const text = createRef<HostInstance>()
    const image = createRef<HostInstance>()
    const pressable = createRef<HostInstance>()
    const touchable = createRef<HostInstance>()
    const scroller = createRef<ScrollViewInstance>()
    const input = createRef<TextInputInstance>()
    render(
      <View>
        <Text ref={text}>Text</Text>
        <Image ref={image} source={{ uri: '/missing.png' }} />
        <Pressable ref={pressable} />
        <TouchableOpacity ref={touchable} />
        <ScrollView ref={scroller} />
        <TextInput ref={input} />
      </View>,
    )
    for (const ref of [text, image, pressable, touchable, scroller, input]) {
      const instance = ref.current as HostInstance
      expect(instance).toBeInstanceOf(HTMLElement)
      const callback = vi.fn()
      instance.measureInWindow(callback)
      expect(callback).toHaveBeenCalledTimes(1)
      expect(typeof instance.measure).toBe('function')
      expect(typeof instance.measureLayout).toBe('function')
      expect(typeof instance.setNativeProps).toBe('function')
    }
  })

  test('setNativeProps of a TextInput takes text and style', () => {
    const input = createRef<TextInputInstance>()
    render(<TextInput ref={input} defaultValue="abc" />)
    input.current?.setNativeProps({ text: 'xyz', style: { opacity: 0.5 } })
    expect(input.current?.value).toBe('xyz')
    expect(getComputedStyle(input.current as HTMLElement).opacity).toBe('0.5')
  })
})

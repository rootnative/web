import { Component, createRef, type ReactElement } from 'react'
import { afterEach, describe, expect, test } from 'vitest'

import { ScrollView, type ScrollViewInstance } from '../../components/ScrollView'
import { View } from '../../components/View'
import { cleanup, render } from '../../test/render'
import { findNodeHandle } from './index'
import type { HostInstance } from '../../components/View/types'

afterEach(cleanup)

describe('findNodeHandle', () => {
  test('returns null for nothing, and a number as it is', () => {
    expect(findNodeHandle(null)).toBeNull()
    expect(findNodeHandle(undefined)).toBeNull()
    expect(findNodeHandle('view')).toBeNull()
    expect(findNodeHandle(7)).toBe(7)
  })

  test('returns the element of a ref and of an element', () => {
    const ref = createRef<HostInstance>()
    const { container } = render(<View ref={ref} />)
    const element = container.firstElementChild
    expect(findNodeHandle(ref)).toBe(element)
    expect(findNodeHandle(element)).toBe(element)
    expect(findNodeHandle(createRef())).toBeNull()
  })

  test('returns the scroll element of a ScrollView', () => {
    const ref = createRef<ScrollViewInstance>()
    render(<ScrollView ref={ref} />)
    const node = ref.current?.getScrollableNode()
    expect(node).toBeInstanceOf(HTMLElement)
    expect(findNodeHandle(ref)).toBe(node)
    expect(findNodeHandle(ref.current)).toBe(node)
  })

  test('returns null for a class component instance', () => {
    class Box extends Component {
      override render(): ReactElement {
        return <View />
      }
    }
    const ref = createRef<Box>()
    render(<Box ref={ref} />)
    expect(ref.current).toBeInstanceOf(Box)
    expect(findNodeHandle(ref)).toBeNull()
  })
})

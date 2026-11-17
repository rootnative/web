/**
 * @license MIT
 * A port of `Libraries/Animated/nodes/AnimatedProps.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

import { flattenStyle } from '../../../style/compile'
import type { FlatStyle, StyleProp } from '../../../style/types'
import { AnimatedEvent } from '../AnimatedEvent'
import { AnimatedNode } from './AnimatedNode'
import { AnimatedObject } from './AnimatedObject'
import { AnimatedStyle } from './AnimatedStyle'

type Props = Readonly<Record<string, unknown>>

const flatten = (style: unknown): FlatStyle | undefined =>
  flattenStyle(style as StyleProp<FlatStyle>)

// The props of one animated component: a leaf of the graph. A change of a node calls `update()`,
// and the component writes the new values to its element. React Native takes the callback in the
// constructor. Here the component sets it when its element mounts.
export class AnimatedProps extends AnimatedNode {
  private readonly nodes: readonly AnimatedNode[]
  private readonly nodeKeys: readonly string[]
  private readonly props: Props
  private callback: (() => void) | null = null

  constructor(inputProps: Props) {
    super()
    const nodes: AnimatedNode[] = []
    const nodeKeys: string[] = []
    const props: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(inputProps)) {
      let node: AnimatedNode | null
      if (key === 'style') {
        node = AnimatedStyle.from(flatten(value))
      } else if (value instanceof AnimatedNode) {
        node = value
      } else {
        node = AnimatedObject.from(value)
      }
      if (node === null) {
        props[key] = value
      } else {
        nodes.push(node)
        nodeKeys.push(key)
        props[key] = node
      }
    }
    this.nodes = nodes
    this.nodeKeys = nodeKeys
    this.props = props
  }

  setUpdateCallback(callback: (() => void) | null): void {
    this.callback = callback
  }

  // True when a node drives `style` and no other prop. A frame can then write the style to the
  // element with no render.
  animatesOnlyStyle(): boolean {
    return this.nodeKeys.every((key) => key === 'style')
  }

  override __getValue(): Props {
    const props: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(this.props)) {
      if (value instanceof AnimatedNode) props[key] = value.__getValue()
      else if (value instanceof AnimatedEvent) props[key] = value.__getHandler()
      else props[key] = value
    }
    return props
  }

  // `staticProps` with the current value of each node of this object. `style` comes back flat.
  __getValueWithStaticProps(staticProps: Props): Record<string, unknown> {
    const props: Record<string, unknown> = { ...staticProps }
    for (const key of Object.keys(staticProps)) {
      const node = this.props[key]
      if (key === 'style') {
        props[key] = this.styleWithStaticStyle(staticProps[key])
      } else if (node instanceof AnimatedNode) {
        props[key] = node.__getValue()
      } else if (node instanceof AnimatedEvent) {
        props[key] = node.__getHandler()
      }
    }
    return props
  }

  // `staticStyle`, flat, with the current value of each node of the style.
  styleWithStaticStyle(staticStyle: unknown): FlatStyle | undefined {
    const node = this.props['style']
    const flatStatic = flatten(staticStyle)
    if (!(node instanceof AnimatedStyle)) return flatStatic
    // A copy, unless `flattenStyle` made a new object already.
    const style: Record<string, unknown> =
      flatStatic === undefined
        ? {}
        : flatStatic === staticStyle
          ? { ...flatStatic }
          : (flatStatic as Record<string, unknown>)
    node.__replaceAnimatedNodeWithValues(style)
    return style
  }

  // Only the animated props, with their values.
  override __getAnimatedValue(): Props {
    const props: Record<string, unknown> = {}
    this.nodes.forEach((node, index) => {
      props[this.nodeKeys[index] ?? ''] = node.__getAnimatedValue()
    })
    return props
  }

  override __attach(): void {
    for (const node of this.nodes) node.__addChild(this)
    super.__attach()
  }

  override __detach(): void {
    for (const node of this.nodes) node.__removeChild(this)
    super.__detach()
  }

  update(): void {
    this.callback?.()
  }
}

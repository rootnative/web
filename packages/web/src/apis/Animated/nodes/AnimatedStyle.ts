/**
 * @license MIT
 * A port of `Libraries/Animated/nodes/AnimatedStyle.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

import { AnimatedNode } from './AnimatedNode'
import { AnimatedObject } from './AnimatedObject'
import { AnimatedTransform } from './AnimatedTransform'
import { AnimatedWithChildren } from './AnimatedWithChildren'

type FlatStyle = Readonly<Record<string, unknown>>

// React Native's web branch keeps only the animated keys and renders `[originalStyle, values]`,
// for react-native-web. This package takes React Native's native branch: the style keeps every
// key, so a render gives one flat object of plain values, and a frame resolves the whole style.
export class AnimatedStyle extends AnimatedWithChildren {
  private readonly nodes: readonly AnimatedNode[]
  private readonly style: FlatStyle

  // An `AnimatedStyle` when `flatStyle` holds a node, else null.
  static from(flatStyle: FlatStyle | undefined): AnimatedStyle | null {
    if (flatStyle === undefined) return null
    const nodes: AnimatedNode[] = []
    const style: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(flatStyle)) {
      let node: AnimatedNode | null
      if (key === 'transform' && value !== null && value !== undefined) {
        node = AnimatedTransform.from(value)
      } else if (value instanceof AnimatedNode) {
        node = value
      } else {
        node = AnimatedObject.from(value)
      }
      if (node === null) {
        style[key] = value
      } else {
        nodes.push(node)
        style[key] = node
      }
    }
    return nodes.length === 0 ? null : new AnimatedStyle(nodes, style)
  }

  constructor(nodes: readonly AnimatedNode[], style: FlatStyle) {
    super()
    this.nodes = nodes
    this.style = style
  }

  override __getValue(): FlatStyle {
    const style: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(this.style)) {
      style[key] = value instanceof AnimatedNode ? value.__getValue() : value
    }
    return style
  }

  // Puts the value of each node in `style`, at the key of that node.
  __replaceAnimatedNodeWithValues(style: Record<string, unknown>): void {
    for (const key of Object.keys(style)) {
      const node = this.style[key]
      if (key === 'transform' && node instanceof AnimatedTransform) {
        const transforms = style[key]
        style[key] = node.__getValueWithStaticTransforms(
          Array.isArray(transforms) ? transforms : [],
        )
      } else if (node instanceof AnimatedObject) {
        style[key] = node.__getValueWithStaticObject(style[key])
      } else if (node instanceof AnimatedNode) {
        style[key] = node.__getValue()
      }
    }
  }

  // Only the animated keys, with their values.
  override __getAnimatedValue(): FlatStyle {
    const style: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(this.style)) {
      if (value instanceof AnimatedNode) style[key] = value.__getAnimatedValue()
    }
    return style
  }

  override __attach(): void {
    for (const node of this.nodes) node.__addChild(this)
    super.__attach()
  }

  override __detach(): void {
    for (const node of this.nodes) node.__removeChild(this)
    super.__detach()
  }
}

/**
 * @license MIT
 * A port of `Libraries/Animated/nodes/AnimatedTransform.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

import { AnimatedNode } from './AnimatedNode'
import { AnimatedWithChildren } from './AnimatedWithChildren'

type Transform = Readonly<Record<string, unknown>>

const flatAnimatedNodes = (transforms: readonly Transform[]): AnimatedNode[] => {
  const nodes: AnimatedNode[] = []
  for (const transform of transforms) {
    for (const key in transform) {
      const value = transform[key]
      if (value instanceof AnimatedNode) nodes.push(value)
    }
  }
  return nodes
}

const mapTransforms = (
  transforms: readonly Transform[],
  fn: (node: AnimatedNode) => unknown,
): Transform[] =>
  transforms.map((transform) => {
    const result: Record<string, unknown> = {}
    for (const key in transform) {
      const value = transform[key]
      if (value instanceof AnimatedNode) {
        result[key] = fn(value)
      } else if (Array.isArray(value)) {
        result[key] = value.map((element: unknown) =>
          element instanceof AnimatedNode ? fn(element) : element,
        )
      } else if (typeof value === 'object' && value !== null) {
        const object: Record<string, unknown> = {}
        for (const [name, entry] of Object.entries(value)) {
          object[name] = entry instanceof AnimatedNode ? fn(entry) : entry
        }
        result[key] = object
      } else {
        result[key] = value
      }
    }
    return result
  })

// A `transform` array with nodes, such as `[{ translateX: node }, { rotate: '45deg' }]`.
export class AnimatedTransform extends AnimatedWithChildren {
  private readonly nodes: readonly AnimatedNode[]
  private readonly transforms: readonly Transform[]

  // An `AnimatedTransform` when `transforms` holds a node, else null.
  static from(transforms: unknown): AnimatedTransform | null {
    const list = Array.isArray(transforms) ? (transforms as Transform[]) : []
    const nodes = flatAnimatedNodes(list)
    return nodes.length === 0 ? null : new AnimatedTransform(nodes, list)
  }

  constructor(nodes: readonly AnimatedNode[], transforms: readonly Transform[]) {
    super()
    this.nodes = nodes
    this.transforms = transforms
  }

  override __getValue(): Transform[] {
    return mapTransforms(this.transforms, (node) => node.__getValue())
  }

  // The values of the nodes, in order, at the places of the nodes in `staticTransforms`.
  __getValueWithStaticTransforms(staticTransforms: readonly Transform[]): Transform[] {
    const values: unknown[] = []
    mapTransforms(this.transforms, (node) => values.push(node.__getValue()))
    return mapTransforms(staticTransforms, () => values.shift())
  }

  override __getAnimatedValue(): Transform[] {
    return mapTransforms(this.transforms, (node) => node.__getAnimatedValue())
  }

  // The name of each transform, such as `translateX`.
  properties(): string[] {
    return this.transforms.flatMap((transform) => Object.keys(transform))
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

/**
 * @license MIT
 * A port of `Libraries/Animated/nodes/AnimatedObject.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

import { isValidElement } from 'react'

import { AnimatedNode } from './AnimatedNode'
import { AnimatedWithChildren } from './AnimatedWithChildren'

// The search for nodes stops at this depth, so a large prop such as list data stays cheap.
const MAX_DEPTH = 5

export const isPlainObject = (value: unknown): value is Readonly<Record<string, unknown>> => {
  if (value === null || typeof value !== 'object') return false
  const proto: unknown = Object.getPrototypeOf(value)
  return (proto === null || proto === Object.prototype) && !isValidElement(value)
}

const flatAnimatedNodes = (
  value: unknown,
  nodes: AnimatedNode[] = [],
  depth = 0,
): AnimatedNode[] => {
  if (depth >= MAX_DEPTH) return nodes
  if (value instanceof AnimatedNode) {
    nodes.push(value)
  } else if (Array.isArray(value)) {
    for (const element of value) flatAnimatedNodes(element, nodes, depth + 1)
  } else if (isPlainObject(value)) {
    for (const key of Object.keys(value)) flatAnimatedNodes(value[key], nodes, depth + 1)
  }
  return nodes
}

export const animatedNodesIn = (value: unknown): AnimatedNode[] => flatAnimatedNodes(value)

const mapAnimatedNodes = (
  value: unknown,
  fn: (node: AnimatedNode) => unknown,
  depth = 0,
): unknown => {
  if (depth >= MAX_DEPTH) return value
  if (value instanceof AnimatedNode) return fn(value)
  if (Array.isArray(value)) return value.map((element) => mapAnimatedNodes(element, fn, depth + 1))
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(value)) result[key] = mapAnimatedNodes(value[key], fn, depth + 1)
    return result
  }
  return value
}

// A plain object or an array with nodes inside, such as `shadowOffset: { width: node }`.
export class AnimatedObject extends AnimatedWithChildren {
  private readonly nodes: readonly AnimatedNode[]
  private readonly value: unknown

  // An `AnimatedObject` when `value` holds a node, else null.
  static from(value: unknown): AnimatedObject | null {
    const nodes = flatAnimatedNodes(value)
    return nodes.length === 0 ? null : new AnimatedObject(nodes, value)
  }

  constructor(nodes: readonly AnimatedNode[], value: unknown) {
    super()
    this.nodes = nodes
    this.value = value
  }

  override __getValue(): unknown {
    return mapAnimatedNodes(this.value, (node) => node.__getValue())
  }

  // The values of the nodes, in order, at the places of the nodes in `staticObject`.
  __getValueWithStaticObject(staticObject: unknown): unknown {
    let index = 0
    return mapAnimatedNodes(staticObject, () => this.nodes[index++]?.__getValue())
  }

  override __getAnimatedValue(): unknown {
    return mapAnimatedNodes(this.value, (node) => node.__getAnimatedValue())
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

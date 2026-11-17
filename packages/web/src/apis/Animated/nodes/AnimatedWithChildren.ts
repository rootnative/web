/**
 * @license MIT
 * A port of `Libraries/Animated/nodes/AnimatedWithChildren.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

import { warnOnce } from '../../../utils/warn'
import { AnimatedNode } from './AnimatedNode'

// A node that other nodes read. A node attaches to its parents when it gets its first child, as in
// React Native. So a node that nothing reads stays out of the graph, and its listeners don't fire
// when its parent changes.
export class AnimatedWithChildren extends AnimatedNode {
  private readonly children: AnimatedNode[] = []

  override __addChild(child: AnimatedNode): void {
    if (this.children.length === 0) this.__attach()
    this.children.push(child)
  }

  override __removeChild(child: AnimatedNode): void {
    const index = this.children.indexOf(child)
    if (index === -1) {
      warnOnce(
        'animated-remove-child',
        "Animated: a node can't remove a child that it doesn't have.",
      )
      return
    }
    this.children.splice(index, 1)
    if (this.children.length === 0) this.__detach()
  }

  override __getChildren(): readonly AnimatedNode[] {
    return this.children
  }

  override __callListeners(value: unknown): void {
    super.__callListeners(value)
    for (const child of this.children) child.__callListeners(child.__getValue())
  }
}

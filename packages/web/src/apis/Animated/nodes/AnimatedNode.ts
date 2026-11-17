/**
 * @license MIT
 * A port of `Libraries/Animated/nodes/AnimatedNode.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

export type ValueListenerCallback = (state: { value: number }) => unknown

export type AnimatedNodeConfig = Readonly<{
  debugID?: string | undefined
  unstable_disableBatchingForNativeCreate?: boolean | undefined
}>

let nextListenerId = 1

// The web has no native driver, so the native half of React Native's node is left out. The methods
// with `__` keep React Native's names, because libraries call them: react-native-svg calls
// `__getAnimatedValue`.
export class AnimatedNode {
  private readonly listeners = new Map<string, ValueListenerCallback>()

  __attach(): void {}

  // React Native keeps the listeners on a detach (`animatedKeepListenersOnDetach`, on since 0.80).
  __detach(): void {}

  __getValue(): unknown {
    return undefined
  }

  __getAnimatedValue(): unknown {
    return this.__getValue()
  }

  __addChild(_child: AnimatedNode): void {}

  __removeChild(_child: AnimatedNode): void {}

  __getChildren(): readonly AnimatedNode[] {
    return []
  }

  addListener(callback: ValueListenerCallback): string {
    const id = String(nextListenerId++)
    this.listeners.set(id, callback)
    return id
  }

  removeListener(id: string): void {
    this.listeners.delete(id)
  }

  removeAllListeners(): void {
    this.listeners.clear()
  }

  hasListeners(): boolean {
    return this.listeners.size > 0
  }

  // An interpolation gives its listeners a string when its output is a string, as in React Native.
  __callListeners(value: unknown): void {
    const state = { value: value as number }
    for (const listener of this.listeners.values()) listener(state)
  }

  // Keeps `JSON.stringify` from a cycle in React DevTools.
  toJSON(): unknown {
    return this.__getValue()
  }
}

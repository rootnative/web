import type { HostInstance, HostMethods } from '../components/View/types'
import { flattenStyle } from '../style/compile'
import { resolveStyle } from '../style/resolveStyle'
import type { FlatStyle, StyleProp } from '../style/types'
import { warnOnce } from '../utils/warn'

// Writes the `style` of `setNativeProps` as an inline style, so it stays until the next call, as
// on native. Any other prop has no direct path to the element.
export const applyNativeProps = (element: HTMLElement, nativeProps: object): void => {
  const inline = element.style as unknown as Record<string, string>
  for (const [name, value] of Object.entries(nativeProps)) {
    if (name !== 'style') {
      warnOnce(
        `set-native-props-${name}`,
        `setNativeProps: only \`style\` works on the web. \`${name}\` has no effect.`,
      )
      continue
    }
    const flat = flattenStyle(value as StyleProp<FlatStyle>)
    if (flat !== undefined) Object.assign(inline, resolveStyle(flat))
  }
}

const hostMethods = (element: HTMLElement): HostMethods => ({
  measure: (callback) => {
    const { left, top, width, height } = element.getBoundingClientRect()
    const parent = element.parentElement?.getBoundingClientRect()
    callback(left - (parent?.left ?? 0), top - (parent?.top ?? 0), width, height, left, top)
  },
  measureInWindow: (callback) => {
    const { left, top, width, height } = element.getBoundingClientRect()
    callback(left, top, width, height)
  },
  measureLayout: (relativeToNativeNode, onSuccess, onFail) => {
    // As on native, the other node must be an ancestor that is on screen.
    if (
      !(relativeToNativeNode instanceof Element) ||
      !element.isConnected ||
      !relativeToNativeNode.contains(element)
    ) {
      onFail?.()
      return
    }
    const { left, top, width, height } = element.getBoundingClientRect()
    const ancestor = relativeToNativeNode.getBoundingClientRect()
    onSuccess(left - ancestor.left, top - ancestor.top, width, height)
  },
  setNativeProps: (nativeProps) => applyNativeProps(element, nativeProps),
})

// Adds the methods of a React Native host instance to the element, once.
export const withHostMethods = <T extends HTMLElement>(element: T): T & HostMethods => {
  const instance = element as T & Partial<HostInstance>
  if (instance.measureInWindow === undefined) Object.assign(instance, hostMethods(element))
  return instance as T & HostMethods
}

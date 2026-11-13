const isElement = (value: object): value is Element =>
  (value as { nodeType?: unknown }).nodeType === 1

/**
 * Compat export. On native it returns the tag of a view. On the web it returns the DOM element
 * of a ref, of an element, or of a scroll component. A number comes back as it is. A class
 * component instance gives `null`, because React has no `findDOMNode`.
 */
export const findNodeHandle = (componentOrHandle: unknown): Element | number | null => {
  if (typeof componentOrHandle === 'number') return componentOrHandle
  if (typeof componentOrHandle !== 'object' || componentOrHandle === null) return null
  if (isElement(componentOrHandle)) return componentOrHandle

  const { getScrollableNode } = componentOrHandle as { getScrollableNode?: unknown }
  if (typeof getScrollableNode === 'function') {
    return findNodeHandle(getScrollableNode.call(componentOrHandle))
  }
  if ('current' in componentOrHandle) return findNodeHandle(componentOrHandle.current)
  return null
}

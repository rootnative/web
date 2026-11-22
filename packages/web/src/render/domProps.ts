import type { AccessibilityProps } from '../components/View/types'

export type DOMProps = Record<string, unknown>

type Input = AccessibilityProps & Record<string, unknown>

const liveRegionToAriaLive: Record<string, string> = {
  none: 'off',
  polite: 'polite',
  assertive: 'assertive',
}

// React Native handlers that are not DOM events. A component maps them itself.
const nativeHandler =
  /^on(Press|Layout|TextLayout|Accessibility|Magic|Responder|Refresh|.*ShouldSet)/

export const isNativeHandler = (name: string): boolean => nativeHandler.test(name)

const passThrough = new Set(['lang', 'dir', 'target', 'rel', 'download'])

// The events that React DOM 19 registers. Each has a handler prop and its `Capture` form. A
// library can spread its own callback, such as `onValueChange`, onto a View: React Native and
// react-native-web drop it, and React DOM logs an error for an `on*` prop that it doesn't know.
const reactDOMEvents =
  'abort animationEnd animationIteration animationStart auxClick beforeInput beforeToggle blur ' +
  'cancel canPlay canPlayThrough change click close compositionEnd compositionStart ' +
  'compositionUpdate contextMenu copy cut doubleClick drag dragEnd dragEnter dragExit dragLeave ' +
  'dragOver dragStart drop durationChange emptied encrypted ended error focus fullscreenChange ' +
  'fullscreenError gotPointerCapture input invalid keyDown keyPress keyUp load loadedData ' +
  'loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp ' +
  'paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver ' +
  'pointerUp progress rateChange reset resize scroll scrollEnd seeked seeking select stalled ' +
  'submit suspend timeUpdate toggle touchCancel touchEnd touchMove touchStart transitionCancel ' +
  'transitionEnd transitionRun transitionStart volumeChange waiting wheel'

// react-native-web's form of the anchor attributes. Libraries written for it send it, for example
// the `Link` of Expo Router. The types don't declare it, because a library can declare it with a
// module augmentation, and a second declaration with another type breaks that merge.
const hrefAttrsToDOM = (hrefAttrs: unknown, out: DOMProps): void => {
  if (typeof hrefAttrs !== 'object' || hrefAttrs === null) return
  const { download, rel, target } = hrefAttrs as Record<string, unknown>
  if (download != null) out['download'] ??= download
  if (rel != null) out['rel'] ??= rel
  // As in react-native-web: `blank` becomes `_blank`.
  if (typeof target === 'string') out['target'] ??= target.startsWith('_') ? target : `_${target}`
}

export const domEventHandlers: ReadonlySet<string> = new Set([
  ...reactDOMEvents.split(' ').flatMap((event) => {
    const name = `on${event.charAt(0).toUpperCase()}${event.slice(1)}`
    return [name, `${name}Capture`]
  }),
  // These four have no capture phase.
  'onMouseEnter',
  'onMouseLeave',
  'onPointerEnter',
  'onPointerLeave',
])

// Maps React Native props to DOM attributes. Unknown props are dropped, so they never
// reach the element. `aria-*` and `data-*` props, and the event handlers of React DOM, pass
// through as they are.
export const toDOMProps = (props: Input): DOMProps => {
  const out: DOMProps = {}

  for (const name in props) {
    const value = props[name]
    if (value === undefined) continue
    if (
      name.startsWith('aria-') ||
      name.startsWith('data-') ||
      passThrough.has(name) ||
      domEventHandlers.has(name)
    ) {
      out[name] = value
    }
  }

  const {
    accessibilityLabel,
    accessibilityLabelledBy,
    accessibilityHint,
    accessibilityState,
    accessibilityValue,
    accessibilityLiveRegion,
    accessibilityElementsHidden,
    accessibilityViewIsModal,
    importantForAccessibility,
    id,
    nativeID,
    testID,
    tabIndex,
    focusable,
    href,
    hrefAttrs,
  } = props

  if (accessibilityLabel !== undefined) out['aria-label'] ??= accessibilityLabel
  if (accessibilityLabelledBy !== undefined) {
    out['aria-labelledby'] ??= Array.isArray(accessibilityLabelledBy)
      ? accessibilityLabelledBy.join(' ')
      : accessibilityLabelledBy
  }
  if (accessibilityHint !== undefined) out['aria-description'] ??= accessibilityHint
  if (accessibilityLiveRegion !== undefined) {
    out['aria-live'] ??= liveRegionToAriaLive[accessibilityLiveRegion]
  }
  if (accessibilityViewIsModal !== undefined) out['aria-modal'] ??= accessibilityViewIsModal
  if (accessibilityElementsHidden === true || importantForAccessibility === 'no-hide-descendants') {
    out['aria-hidden'] ??= true
  }

  if (accessibilityState !== undefined) {
    const { busy, checked, disabled, expanded, selected } = accessibilityState
    if (busy !== undefined) out['aria-busy'] ??= busy
    if (checked !== undefined) out['aria-checked'] ??= checked
    if (disabled !== undefined) out['aria-disabled'] ??= disabled
    if (expanded !== undefined) out['aria-expanded'] ??= expanded
    if (selected !== undefined) out['aria-selected'] ??= selected
  }

  if (accessibilityValue !== undefined) {
    const { max, min, now, text } = accessibilityValue
    if (max !== undefined) out['aria-valuemax'] ??= max
    if (min !== undefined) out['aria-valuemin'] ??= min
    if (now !== undefined) out['aria-valuenow'] ??= now
    if (text !== undefined) out['aria-valuetext'] ??= text
  }

  const domId = id ?? nativeID
  if (domId !== undefined) out['id'] = domId
  if (testID !== undefined) out['data-testid'] = testID
  if (href !== undefined) {
    out['href'] = href
    hrefAttrsToDOM(hrefAttrs, out)
  }

  if (tabIndex !== undefined) out['tabIndex'] = tabIndex
  else if (focusable === true) out['tabIndex'] = 0
  else if (focusable === false) out['tabIndex'] = -1

  return out
}

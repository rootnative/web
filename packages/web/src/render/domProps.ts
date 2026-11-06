import type { AccessibilityProps } from '../components/View/types'

export type DOMProps = Record<string, unknown>

type Input = AccessibilityProps & Record<string, unknown>

const liveRegionToAriaLive: Record<string, string> = {
  none: 'off',
  polite: 'polite',
  assertive: 'assertive',
}

// Maps React Native props to DOM attributes. Unknown props are dropped, so they never
// reach the element. `aria-*`, `data-*`, and `on*` props pass through as they are.
export const toDOMProps = (props: Input): DOMProps => {
  const out: DOMProps = {}

  for (const name in props) {
    const value = props[name]
    if (value === undefined) continue
    if (name.startsWith('aria-') || name.startsWith('data-')) {
      out[name] = value
    } else if (name.startsWith('on') && name.length > 2 && name !== 'onLayout') {
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
  if (href !== undefined) out['href'] = href

  if (tabIndex !== undefined) out['tabIndex'] = tabIndex
  else if (focusable === true) out['tabIndex'] = 0
  else if (focusable === false) out['tabIndex'] = -1

  return out
}

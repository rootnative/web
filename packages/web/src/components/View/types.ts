import type { DOMAttributes, ReactNode, Ref } from 'react'

import type { ViewStyle } from '../../apis/StyleSheet/types'
import type { NativeSyntheticEvent } from '../../events/types'
import type { StyleProp } from '../../style/types'

export type MeasureOnSuccessCallback = (
  x: number,
  y: number,
  width: number,
  height: number,
  pageX: number,
  pageY: number,
) => void

export type MeasureInWindowOnSuccessCallback = (
  x: number,
  y: number,
  width: number,
  height: number,
) => void

export type MeasureLayoutOnSuccessCallback = (
  left: number,
  top: number,
  width: number,
  height: number,
) => void

export type HostMethods = {
  measure: (callback: MeasureOnSuccessCallback) => void
  measureInWindow: (callback: MeasureInWindowOnSuccessCallback) => void
  measureLayout: (
    relativeToNativeNode: Element | number,
    onSuccess: MeasureLayoutOnSuccessCallback,
    onFail?: () => void,
  ) => void
  setNativeProps: (nativeProps: object) => void
}

// React Native 0.88's host instance is a DOM-like element. Here it's the DOM element, with the
// measure methods of the native one.
export type HostInstance = HTMLElement & HostMethods

export type ViewInstance = HostInstance

// The event of `onAccessibilityAction` on native. The web has no accessibility actions yet.
export type AccessibilityActionEvent = NativeSyntheticEvent<Readonly<{ actionName: string }>>

export type LayoutRectangle = { x: number; y: number; width: number; height: number }

export type LayoutChangeEvent = { nativeEvent: { layout: LayoutRectangle } }

export type AccessibilityState = {
  disabled?: boolean | undefined
  selected?: boolean | undefined
  checked?: boolean | 'mixed' | undefined
  busy?: boolean | undefined
  expanded?: boolean | undefined
}

export type AccessibilityValue = {
  min?: number | undefined
  max?: number | undefined
  now?: number | undefined
  text?: string | undefined
}

export type Role =
  | 'alert'
  | 'alertdialog'
  | 'application'
  | 'article'
  | 'banner'
  | 'button'
  | 'cell'
  | 'checkbox'
  | 'columnheader'
  | 'combobox'
  | 'complementary'
  | 'contentinfo'
  | 'definition'
  | 'dialog'
  | 'directory'
  | 'document'
  | 'feed'
  | 'figure'
  | 'form'
  | 'grid'
  | 'group'
  | 'heading'
  | 'img'
  | 'link'
  | 'list'
  | 'listitem'
  | 'log'
  | 'main'
  | 'marquee'
  | 'math'
  | 'menu'
  | 'menubar'
  | 'menuitem'
  | 'meter'
  | 'navigation'
  | 'none'
  | 'note'
  | 'option'
  | 'presentation'
  | 'progressbar'
  | 'radio'
  | 'radiogroup'
  | 'region'
  | 'row'
  | 'rowgroup'
  | 'rowheader'
  | 'scrollbar'
  | 'searchbox'
  | 'separator'
  | 'slider'
  | 'spinbutton'
  | 'status'
  | 'summary'
  | 'switch'
  | 'tab'
  | 'table'
  | 'tablist'
  | 'tabpanel'
  | 'term'
  | 'timer'
  | 'toolbar'
  | 'tooltip'
  | 'tree'
  | 'treegrid'
  | 'treeitem'

// Every DOM handler react-dom accepts, minus the two that are not events.
export type DOMEventHandlers<T> = Omit<DOMAttributes<T>, 'children' | 'dangerouslySetInnerHTML'>

// An interface, as in React Native, so a library can add props with a module augmentation.
export interface AccessibilityProps {
  // Web only. Any other ARIA or data attribute passes through to the element.
  [key: `aria-${string}`]: string | number | boolean | undefined
  [key: `data-${string}`]: string | number | boolean | undefined
  accessible?: boolean | undefined
  accessibilityLabel?: string | undefined
  accessibilityLabelledBy?: string | ReadonlyArray<string> | undefined
  accessibilityHint?: string | undefined
  accessibilityRole?: string | undefined
  accessibilityState?: AccessibilityState | undefined
  accessibilityValue?: AccessibilityValue | undefined
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive' | undefined
  accessibilityElementsHidden?: boolean | undefined
  accessibilityViewIsModal?: boolean | undefined
  importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants' | undefined
  role?: Role | undefined
  'aria-busy'?: boolean | undefined
  'aria-checked'?: boolean | 'mixed' | undefined
  'aria-disabled'?: boolean | undefined
  'aria-expanded'?: boolean | undefined
  'aria-hidden'?: boolean | undefined
  'aria-label'?: string | undefined
  'aria-labelledby'?: string | undefined
  'aria-live'?: 'polite' | 'assertive' | 'off' | undefined
  'aria-modal'?: boolean | undefined
  'aria-selected'?: boolean | undefined
  'aria-valuemax'?: number | undefined
  'aria-valuemin'?: number | undefined
  'aria-valuenow'?: number | undefined
  'aria-valuetext'?: string | undefined
}

// An interface, as in React Native, so a library can add props with a module augmentation.
export interface ViewProps extends AccessibilityProps, DOMEventHandlers<HTMLElement> {
  children?: ReactNode
  style?: StyleProp<ViewStyle> | undefined
  ref?: Ref<ViewInstance> | undefined
  id?: string | undefined
  nativeID?: string | undefined
  testID?: string | undefined
  tabIndex?: 0 | -1 | undefined
  focusable?: boolean | undefined
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only' | undefined
  collapsable?: boolean | undefined
  onLayout?: ((event: LayoutChangeEvent) => void) | undefined
  // Declared here too, so the DOM type wins when a library adds its own `onKeyDown` to this
  // interface with a module augmentation.
  onKeyDown?: DOMEventHandlers<HTMLElement>['onKeyDown']
  // Web only. The level of a `heading` role, 1 to 6.
  'aria-level'?: number | undefined
  // Web only. Renders an anchor.
  href?: string | undefined
}

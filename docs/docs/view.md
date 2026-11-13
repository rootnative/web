---
id: view
title: View
description: The basic container. It renders a div, or the element that its role picks, with the React Native layout defaults.
---

# `View`

The basic container. It renders a `<div>`, or the element that its [`role`](/semantic-html) picks, with the React Native layout defaults.

```tsx
import { StyleSheet, View } from 'react-native'

export function Toolbar({ children }) {
  return (
    <View role="navigation" style={styles.toolbar}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', gap: 8, padding: 12 },
})
```

## Props

| Prop                                                   | On the web                                                                                                                                                      |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `style`                                                | Compiles to atomic CSS. See [Styles](/styles).                                                                                                                  |
| `role`, `accessibilityRole`                            | Picks the element. See [Semantic HTML](/semantic-html).                                                                                                         |
| `accessibilityLabel` and the other accessibility props | Become ARIA attributes. See [Accessibility props](/semantic-html#accessibility-props).                                                                          |
| `onLayout`                                             | Fires after mount and after each size change, from a `ResizeObserver`. `x` and `y` are relative to the parent view. A move with no size change doesn't fire it. |
| `pointerEvents`                                        | `none`, `auto`, `box-none`, and `box-only`, as on native.                                                                                                       |
| `focusable`, `tabIndex`                                | `focusable` sets `tabIndex` to 0, or to -1 for `false`. `tabIndex` wins when you set both.                                                                      |
| `nativeID`, `id`, `testID`                             | `id`, `id`, and `data-testid`.                                                                                                                                  |
| `href`                                                 | **Web only.** Renders an `<a>`.                                                                                                                                 |
| `aria-level`                                           | **Web only.** The heading level of `role="heading"`, 1 to 6.                                                                                                    |
| `onClick`, `onKeyDown`, and the other DOM handlers     | **Web only.** Every React DOM event handler passes to the element.                                                                                              |
| `collapsable`, `accessible`                            | Accepted and ignored.                                                                                                                                           |

Any other prop that isn't a React Native prop is dropped.

## Ref

The ref is the DOM element, with the measure methods of a native host instance added. Each one calls its callback at once, with CSS pixels.

| Method                                       | On the web                                                                                                                                    |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `measure(callback)`                          | `x` and `y` in the parent element, `width`, `height`, then `pageX` and `pageY` in the window.                                                 |
| `measureInWindow(callback)`                  | `x` and `y` in the window, `width`, `height`. The window is the visible area, so the values change when the page scrolls.                     |
| `measureLayout(ancestor, onSuccess, onFail)` | `left` and `top` in the ancestor element, `width`, `height`. It calls `onFail` when the other node isn't an ancestor that is in the document. |
| `setNativeProps({ style })`                  | Writes the style as an inline style, so it beats the `style` prop until you set it again. Any other prop has no effect and logs a warning.    |

The sizes come from `getBoundingClientRect()`, so they include a transform, as `measure` does on native. The types are `HostInstance` and `ViewInstance`.

:::note

A ref typed as `useRef<HTMLElement>(null)` no longer fits the `ref` prop. Use `useRef<ViewInstance>(null)`, as on native.

:::

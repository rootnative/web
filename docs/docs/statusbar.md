---
id: statusbar
title: StatusBar
description: StatusBar on the web sets the theme-color meta tag, which mobile browsers paint around the page.
---

# `StatusBar`

The browser has no status bar. Its nearest match is the `theme-color` meta tag, which mobile browsers paint around the page. `StatusBar` writes that tag.

```tsx
import { StatusBar } from 'react-native'

export function DarkScreen() {
  return (
    <>
      <StatusBar backgroundColor="#111827" barStyle="light-content" />
      {/* The screen */}
    </>
  )
}
```

## Props

| Prop                                                                                                     | On the web                         |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `backgroundColor`                                                                                        | Sets the `theme-color` meta tag.   |
| `barStyle`, `hidden`, `translucent`, `animated`, `showHideTransition`, `networkActivityIndicatorVisible` | Accepted. They have no web effect. |

As on native, the last mounted `StatusBar` wins. When it unmounts, the one before it applies again. When none is left, the tag goes back to its first value.

`StatusBar` writes the tag in the browser, after mount, so the server HTML doesn't have it. To have the color in the server HTML, set `themeColor` on [`Head`](/seo) instead. Use one or the other, because both write the same tag.

## Statics

| Member                                                                                               | On the web                                              |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `StatusBar.setBackgroundColor(color)`                                                                | Sets the base color, under every mounted `StatusBar`.   |
| `StatusBar.setBarStyle()`, `setHidden()`, `setTranslucent()`, `setNetworkActivityIndicatorVisible()` | Accepted. No web effect.                                |
| `StatusBar.pushStackEntry()`, `popStackEntry()`, `replaceStackEntry()`                               | As on native.                                           |
| `StatusBar.currentHeight`                                                                            | `null`. The browser has no status bar to make room for. |

---
id: i18nmanager
title: I18nManager
description: Right-to-left layout on the web. isRTL follows the document direction, and forceRTL takes effect at once.
---

# `I18nManager`

Right-to-left layout. On the web, the direction comes from the document: the `dir` attribute or the CSS `direction` of `<html>`.

```tsx
import { I18nManager } from 'react-native'

const arrow = I18nManager.isRTL ? '←' : '→'
```

| Member                                                               | On the web                                                                                                              |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `I18nManager.isRTL`                                                  | `true` when the document direction is right-to-left. It reads the current direction each time.                          |
| `I18nManager.forceRTL(force)`                                        | Sets `dir="rtl"` on `<html>` at once. On native it waits for a restart. `false` clears the attribute.                   |
| `I18nManager.allowRTL(allow)`                                        | `false` makes `isRTL` report `false`. The browser still lays out the page from `dir`, so the layout doesn't change.     |
| `I18nManager.getConstants()`                                         | `{ isRTL, doLeftAndRightSwapInRTL, localeIdentifier }`. `localeIdentifier` is `navigator.language`.                     |
| `I18nManager.swapLeftAndRightInRTL(swap)`, `doLeftAndRightSwapInRTL` | Sets and reports the flag. `true` by default. With `false`, left and right styles stay on the physical side. See below. |

On the server, `isRTL` is `false`.

## Left and right styles

With the default `doLeftAndRightSwapInRTL` of `true`, a left or right style swaps sides in a right-to-left layout, as on native:

| Styles                                                                                              | In a right-to-left layout |
| --------------------------------------------------------------------------------------------------- | ------------------------- |
| `left`, `right`                                                                                     | The start and end edges   |
| `marginLeft`, `marginRight`, `paddingLeft`, `paddingRight`, `marginHorizontal`, `paddingHorizontal` | The start and end sides   |
| `borderLeftWidth`, `borderRightWidth`, `borderLeftColor`, `borderRightColor`                        | The start and end borders |
| `borderTopLeftRadius`, `borderTopRightRadius`, `borderBottomLeftRadius`, `borderBottomRightRadius`  | The start and end corners |

The styles become logical CSS properties, such as `inset-inline-start` for `left`. The class names are the same in both directions, so a server render needs no direction.

- A start or end style wins over a left or right style of the same side: `{ left: 0, start: 8 }` gives 8.
- Call `swapLeftAndRightInRTL(false)` before the first render. Left and right styles then stay on the physical side.
- A `transform` doesn't swap. `translateX: 10` moves to the right in both directions, as on native.

One difference from native: the swap follows the direction of each element, not of the app. In a left-to-right app, a view with `direction: 'rtl'` has its `left` at the right edge. On native that view keeps `left` at the left edge.

For a style that reads the same in every setup, use the start and end props: `marginStart`, `paddingEnd`, `start`, and the others. See [Right-to-left](/styles#right-to-left).

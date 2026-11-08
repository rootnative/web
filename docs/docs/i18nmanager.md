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

| Member                                                               | On the web                                                                                                          |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `I18nManager.isRTL`                                                  | `true` when the document direction is right-to-left. It reads the current direction each time.                      |
| `I18nManager.forceRTL(force)`                                        | Sets `dir="rtl"` on `<html>` at once. On native it waits for a restart. `false` clears the attribute.               |
| `I18nManager.allowRTL(allow)`                                        | `false` makes `isRTL` report `false`. The browser still lays out the page from `dir`, so the layout doesn't change. |
| `I18nManager.getConstants()`                                         | `{ isRTL, doLeftAndRightSwapInRTL, localeIdentifier }`. `localeIdentifier` is `navigator.language`.                 |
| `I18nManager.swapLeftAndRightInRTL(swap)`, `doLeftAndRightSwapInRTL` | Stores and reports the flag. It has no effect on styles yet. See below.                                             |

On the server, `isRTL` is `false`.

## Left and right styles

On native, with the default `doLeftAndRightSwapInRTL` of `true`, `marginLeft`, `paddingLeft`, `left`, and their right partners swap in a right-to-left layout. On the web they don't swap yet: they stay on the physical side.

For styles that must follow the direction, use the start and end props: `marginStart`, `paddingEnd`, `start`, and the others. They work the same on every platform. See [Right-to-left](/styles#right-to-left).

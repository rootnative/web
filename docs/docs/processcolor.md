---
id: processcolor
title: processColor
description: processColor turns a color into the 32-bit ARGB number that React Native passes to native code.
---

# `processColor`

Turns a color into the number that React Native passes to native code. Libraries call it. An app seldom needs it.

```tsx
import { processColor } from 'react-native'

processColor('red') // 4294901760, which is 0xffff0000
```

| Input                                 | Result                                      |
| ------------------------------------- | ------------------------------------------- |
| A color that React Native can parse   | An unsigned 32-bit ARGB integer, as on iOS. |
| A color that React Native can't parse | `null`.                                     |
| `null` or `undefined`                 | The same value.                             |

Android returns the same bits as a signed integer. On the web, the number is always unsigned.

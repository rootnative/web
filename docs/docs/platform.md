---
id: platform
title: Platform
description: Platform.OS is 'web'. Platform.select, Version, isTesting, and isDisableAnimations on the web.
---

# `Platform`

Tells your code which platform it runs on. On the web, `Platform.OS` is `'web'`.

```tsx
import { Platform } from 'react-native'

const shadow = Platform.select({
  web: { boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
  default: { elevation: 2 },
})
```

| Member                         | On the web                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `Platform.OS`                  | `'web'`.                                                                                               |
| `Platform.select(spec)`        | The `web` value, else the `default` value. A `native` key doesn't apply, because the web isn't native. |
| `Platform.Version`             | The user agent string of the browser. An empty string on the server.                                   |
| `Platform.constants`           | `{ reactNativeVersion }`, the React Native release whose API this package matches: 0.88.1.             |
| `Platform.isTV`                | `false`.                                                                                               |
| `Platform.isTesting`           | `true` when `NODE_ENV` (or the bundler mode) is `test`.                                                |
| `Platform.isDisableAnimations` | `true` when the user asks for reduced motion (`prefers-reduced-motion`).                               |

The [Vite plugin](/vite-plugin#platformos) puts `'web'` in place of each `Platform.OS` read when it builds your app, so the minifier drops the code of the other platforms. `Platform.select` keeps its code.

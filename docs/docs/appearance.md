---
id: appearance
title: Appearance
description: The light or dark color scheme on the web, through Appearance and useColorScheme, with an app-wide override.
---

# `Appearance` and `useColorScheme`

The color scheme that the user prefers, light or dark.

```tsx
import { useColorScheme, View } from 'react-native'

export function Screen({ children }) {
  const scheme = useColorScheme()
  return <View style={scheme === 'dark' ? styles.dark : styles.light}>{children}</View>
}
```

Prefer `useColorScheme()` in a component. It renders again when the scheme changes, and it matches the server HTML during hydration.

## API

| Member                              | On the web                                                                                                                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useColorScheme()`                  | `'light'` or `'dark'`. Renders again on a change.                                                                                                                                                            |
| `Appearance.getColorScheme()`       | The override when one is set, else the browser's `prefers-color-scheme`.                                                                                                                                     |
| `Appearance.setColorScheme(scheme)` | `'light'` or `'dark'` overrides the preference for the whole app. It also sets `color-scheme` on `<html>`, so form controls and scrollbars follow it. `null` or `'unspecified'` goes back to the preference. |
| `Appearance.addChangeListener(fn)`  | Calls `fn` with `{ colorScheme }` when the preference or the override changes. Returns `{ remove() }`.                                                                                                       |

## On the server

The server has no preference, so both return `'light'` there. `useColorScheme()` also returns `'light'` during hydration, then the real scheme. `Appearance.getColorScheme()` returns the real scheme in the browser at once, so don't read it in render. See [Server rendering](/server-rendering#values-that-differ-on-the-server).

So a dark-mode user of a server-rendered page sees the light render until the app hydrates. To avoid a light flash, give the page a dark background with a `prefers-color-scheme` media query in its CSS.

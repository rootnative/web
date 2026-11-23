---
id: safeareaview
title: SafeAreaView
description: SafeAreaView on the web. A View with padding from the safe-area insets of the browser. Deprecated, as in React Native.
---

# `SafeAreaView`

:::warning Deprecated
React Native deprecates `SafeAreaView`, and so does this package. Use `react-native-safe-area-context`, which works on the web too. In development, the first render warns once, as React Native does.
:::

A [`View`](/view) with padding that keeps its content out of the notch and the home bar, as on iOS.

```tsx
import { SafeAreaView, Text } from 'react-native'

export function Screen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Text>Content</Text>
    </SafeAreaView>
  )
}
```

The padding is the safe-area inset of the browser on each side: `env(safe-area-inset-top)` and the others. A phone browser has insets only for a page with `viewport-fit=cover` in its viewport tag:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

Without it, and on a desktop, the insets are 0, and the view is a plain `View`, as on Android.

- A padding in `style` wins: `paddingTop` replaces the top inset, and `padding` replaces all four.
- The insets stay on their physical sides, also in a right-to-left layout.

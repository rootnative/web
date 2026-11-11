---
id: activityindicator
title: ActivityIndicator
description: A spinner that shows that something loads, with the sizes and the props of React Native's ActivityIndicator.
---

# `ActivityIndicator`

A spinner that shows that something loads.

```tsx
import { ActivityIndicator, StyleSheet, View } from 'react-native'

export function Loading() {
  return (
    <View style={styles.screen}>
      <ActivityIndicator size="large" accessibilityLabel="Loading" />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center' },
})
```

The spinner is an SVG that turns once each 0.75 seconds. Its element has `role="progressbar"`, so a screen reader announces it. Give it an `accessibilityLabel` that says what loads.

The spinner also turns when the system asks for reduced motion, because it's the only sign that the page is busy.

## Two elements

As on native, `ActivityIndicator` renders a container with the indicator inside.

- `style` and `onLayout` go to the container. The container centers the indicator, so `style={{ flex: 1 }}` puts the spinner in the middle of the space.
- The ref and every other prop, such as `testID` and `accessibilityLabel`, go to the indicator.

## Props

| Prop               | On the web                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `animating`        | `false` stops the indicator and hides it. It keeps its space. The default is `true`.                        |
| `color`            | The color of the spinner. The default is `#999999`, the default of iOS.                                     |
| `hidesWhenStopped` | `false` keeps a stopped indicator visible. The default is `true`. On native, only iOS has this prop.        |
| `size`             | `small` is 20 px and `large` is 36 px. A number is the size in pixels, which native allows only on Android. |
| `style`            | The style of the container.                                                                                 |
| `onLayout`         | The layout of the container.                                                                                |
| View props         | As on [`View`](/view). They go to the indicator.                                                            |

## Ref

The ref is the element of the indicator, not the container.

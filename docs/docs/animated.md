---
id: animated
title: Animated
description: React Native's Animated API on the web, with the JavaScript driver.
---

# `Animated`

React Native's `Animated` API. An animation runs in JavaScript on each frame. A frame writes the new style to the element, with no React render.

```tsx
import { useEffect, useState, type ReactNode } from 'react'
import { Animated } from 'react-native'

export function FadeIn({ children }: { children: ReactNode }) {
  const [opacity] = useState(() => new Animated.Value(0))

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start()
  }, [opacity])

  return <Animated.View style={{ opacity }}>{children}</Animated.View>
}
```

## What's there

| Member                                          | On the web                                                                                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `new Animated.Value(value)`                     | `setValue`, `setOffset`, `flattenOffset`, `extractOffset`, `stopAnimation`, `resetAnimation`, `interpolate`, and the listeners.                              |
| `value.interpolate(config)`                     | Numbers, strings with numbers such as `'90deg'`, and colors, which come out as `rgba()`. `extrapolate`, `extrapolateLeft`, `extrapolateRight`, and `easing`. |
| `Animated.add(a, b)`, `Animated.multiply(a, b)` | A value or a number on each side.                                                                                                                            |
| `Animated.timing(value, config)`                | `toValue`, `duration` (500 ms by default), `easing` (`Easing.inOut(Easing.ease)` by default), and `delay`. See [`Easing`](/easing).                          |
| `Animated.spring(value, config)`                | `stiffness`, `damping`, and `mass`, or `tension` and `friction`, or `bounciness` and `speed`. Also `velocity`, `overshootClamping`, and the rest thresholds. |
| `Animated.parallel(animations, config?)`        | Starts each animation at once. With `stopTogether` (the default), one that stops early stops the rest.                                                       |
| `Animated.event(mapping, config)`               | A handler that sets each mapped value from the event, then calls `listener`.                                                                                 |
| `Animated.View`, `Animated.Text`                | A value in `style` or in `transform` animates.                                                                                                               |
| `Animated.createAnimatedComponent(Component)`   | Animates the props of any component.                                                                                                                         |
| `Animated.Node`, `Animated.Interpolation`       | The classes, for types and `instanceof`.                                                                                                                     |

An animation from `timing`, `spring`, or `parallel` has `start(callback?)`, `stop()`, and `reset()`.

## Differences from React Native

- **No native driver.** `useNativeDriver: true` runs the same JavaScript driver. Each frame runs on the main thread, as on react-native-web.
- **Reduced motion.** When the user asks for less motion (`prefers-reduced-motion`), `timing` and `spring` go to `toValue` at once. A `delay` still waits, so a sequence keeps its pauses.
- **`toValue` takes only a number,** and the `velocity` of a spring too. Another `Animated` value as `toValue` throws an error.
- **A value in a prop that isn't `style`** renders the component again on each frame. A value in `style` doesn't.
- **`Animated.event` always returns a function,** also with `useNativeDriver: true`.

## Not there yet

`Animated.ValueXY`, `Animated.Color`, `decay`, `sequence`, `stagger`, `loop`, `delay`, `subtract`, `divide`, `modulo`, `diffClamp`, `forkEvent`, `unforkEvent`, `attachNativeEvent`, `Animated.Image`, `Animated.ScrollView`, `Animated.FlatList`, `Animated.SectionList`, and the hooks `useAnimatedValue`, `useAnimatedValueXY`, and `useAnimatedColor`.

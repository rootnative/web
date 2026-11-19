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

| Member                                                       | On the web                                                                                                                                                                                            |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `new Animated.Value(value)`                                  | `setValue`, `setOffset`, `flattenOffset`, `extractOffset`, `stopAnimation`, `resetAnimation`, `stopTracking`, `interpolate`, and the listeners.                                                       |
| `value.interpolate(config)`                                  | Numbers, strings with numbers such as `'90deg'`, and colors, which come out as `rgba()`. `extrapolate`, `extrapolateLeft`, `extrapolateRight`, and `easing`.                                          |
| `Animated.add`, `subtract`, `multiply`, `divide`             | Take two values, or a value and a number. A division by zero gives 0, as on native.                                                                                                                   |
| `Animated.modulo(value, modulus)`                            | The rest from 0 up to `modulus`, also for a negative value.                                                                                                                                           |
| `Animated.diffClamp(value, min, max)`                        | Adds each change of `value` and keeps the sum from `min` to `max`, so the output moves as soon as `value` turns back. For a header that hides when you scroll down and comes back when you scroll up. |
| `Animated.timing(value, config)`                             | `toValue`, `duration` (500 ms by default), `easing` (`Easing.inOut(Easing.ease)` by default), and `delay`. See [`Easing`](/easing).                                                                   |
| `Animated.spring(value, config)`                             | `stiffness`, `damping`, and `mass`, or `tension` and `friction`, or `bounciness` and `speed`. Also `velocity`, `overshootClamping`, and the rest thresholds.                                          |
| `Animated.decay(value, config)`                              | Starts at `velocity` (units per millisecond) and slows by `deceleration` (0.998 by default) each millisecond.                                                                                         |
| `Animated.sequence(animations)`                              | Starts each animation when the one before it ends. One that stops early ends the sequence.                                                                                                            |
| `Animated.parallel(animations, config?)`                     | Starts each animation at once. With `stopTogether` (the default), one that stops early stops the rest.                                                                                                |
| `Animated.delay(time)`, `Animated.stagger(time, animations)` | `delay` waits `time` ms, for a pause in a sequence. `stagger` starts animation `i` after `time * i` ms.                                                                                               |
| `Animated.loop(animation, config?)`                          | Runs `animation` `iterations` times, or until `stop()` with -1 (the default). With `resetBeforeIteration` (the default), each iteration starts from the first value.                                  |
| `Animated.event(mapping, config)`                            | A handler that sets each mapped value from the event, then calls `listener`.                                                                                                                          |
| `Animated.View`, `Animated.Text`                             | A value in `style` or in `transform` animates.                                                                                                                                                        |
| `Animated.createAnimatedComponent(Component)`                | Animates the props of any component.                                                                                                                                                                  |
| `Animated.Node`, `Animated.Interpolation`                    | The classes, for types and `instanceof`.                                                                                                                                                              |

Each animation has `start(callback?)`, `stop()`, and `reset()`.

The `toValue` of `timing` and `spring` can be another `Animated` value or an interpolation. The animated value then follows it: each change starts a new animation to the new target. `stopAnimation()` or a new animation of the value ends this. `setValue()` doesn't.

## Differences from React Native

- **No native driver.** `useNativeDriver: true` runs the same JavaScript driver. Each frame runs on the main thread, as on react-native-web.
- **Reduced motion.** When the user asks for less motion (`prefers-reduced-motion`), `timing` and `spring` go to `toValue` at once, and `decay` goes at once to the value where it would stop. A `delay` still waits, so a sequence keeps its pauses. A `loop` ends after one iteration.
- **`toValue` takes a number or an `Animated` node,** and the `velocity` of `spring` and `decay` takes only a number. The `{ x, y }` and color forms aren't there yet.
- **A division by zero** logs one warning in development. React Native logs an error each time.
- **A value in a prop that isn't `style`** renders the component again on each frame. A value in `style` doesn't.
- **`Animated.event` always returns a function,** also with `useNativeDriver: true`.

## Not there yet

`Animated.ValueXY`, `Animated.Color`, `forkEvent`, `unforkEvent`, `attachNativeEvent`, `Animated.Image`, `Animated.ScrollView`, `Animated.FlatList`, `Animated.SectionList`, and the hooks `useAnimatedValue`, `useAnimatedValueXY`, and `useAnimatedColor`.

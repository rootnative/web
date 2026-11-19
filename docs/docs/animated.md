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

| Member                                                                             | On the web                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `new Animated.Value(value)`                                                        | `setValue`, `setOffset`, `flattenOffset`, `extractOffset`, `stopAnimation`, `resetAnimation`, `stopTracking`, `interpolate`, and the listeners.                                                       |
| `new Animated.ValueXY({ x, y }?)`                                                  | Two values, `x` and `y`, for a 2D motion such as a drag. The same methods take and give `{ x, y }`. `getLayout()` gives `{ left, top }`, and `getTranslateTransform()` gives the `transform`.         |
| `new Animated.Color(color?)`                                                       | Four values, `r`, `g`, `b` (0 to 255), and `a` (0 to 1), from a color string, `{ r, g, b, a }`, or four `Animated.Value`s. Black by default. Put it in a color style, such as `backgroundColor`.      |
| `useAnimatedValue`, `useAnimatedValueXY`, `useAnimatedColor`                       | Hooks, imported from `react-native`. Each makes its value on the first render and returns the same value after that.                                                                                  |
| `value.interpolate(config)`                                                        | Numbers, strings with numbers such as `'90deg'`, and colors, which come out as `rgba()`. `extrapolate`, `extrapolateLeft`, `extrapolateRight`, and `easing`.                                          |
| `Animated.add`, `subtract`, `multiply`, `divide`                                   | Take two values, or a value and a number. A division by zero gives 0, as on native.                                                                                                                   |
| `Animated.modulo(value, modulus)`                                                  | The rest from 0 up to `modulus`, also for a negative value.                                                                                                                                           |
| `Animated.diffClamp(value, min, max)`                                              | Adds each change of `value` and keeps the sum from `min` to `max`, so the output moves as soon as `value` turns back. For a header that hides when you scroll down and comes back when you scroll up. |
| `Animated.timing(value, config)`                                                   | `toValue`, `duration` (500 ms by default), `easing` (`Easing.inOut(Easing.ease)` by default), and `delay`. See [`Easing`](/easing).                                                                   |
| `Animated.spring(value, config)`                                                   | `stiffness`, `damping`, and `mass`, or `tension` and `friction`, or `bounciness` and `speed`. Also `velocity`, `overshootClamping`, and the rest thresholds.                                          |
| `Animated.decay(value, config)`                                                    | Starts at `velocity` (units per millisecond) and slows by `deceleration` (0.998 by default) each millisecond.                                                                                         |
| `Animated.sequence(animations)`                                                    | Starts each animation when the one before it ends. One that stops early ends the sequence.                                                                                                            |
| `Animated.parallel(animations, config?)`                                           | Starts each animation at once. With `stopTogether` (the default), one that stops early stops the rest.                                                                                                |
| `Animated.delay(time)`, `Animated.stagger(time, animations)`                       | `delay` waits `time` ms, for a pause in a sequence. `stagger` starts animation `i` after `time * i` ms.                                                                                               |
| `Animated.loop(animation, config?)`                                                | Runs `animation` `iterations` times, or until `stop()` with -1 (the default). With `resetBeforeIteration` (the default), each iteration starts from the first value.                                  |
| `Animated.event(mapping, config)`                                                  | A handler that sets each mapped value from the event, then calls `listener`. A `ValueXY` in the mapping takes an `{ x, y }` of the event.                                                             |
| `Animated.forkEvent(handler, listener)`, `Animated.unforkEvent(handler, listener)` | `forkEvent` gives a handler that calls `handler` and then `listener`. On an `Animated.Event`, it adds `listener`, and `unforkEvent` removes it.                                                       |
| `Animated.attachNativeEvent(ref, 'onScroll', mapping)`                             | Sets the values in `mapping[0].nativeEvent` from each `scroll` event of the element of `ref`, with no event prop. Returns `{ detach }`.                                                               |
| `Animated.View`, `Animated.Text`, `Animated.Image`, `Animated.ScrollView`          | A value in `style` or in `transform` animates.                                                                                                                                                        |
| `Animated.FlatList`, `Animated.SectionList`                                        | The lists, with animated props. For `onScroll={Animated.event(...)}`, as on native.                                                                                                                   |
| `Animated.createAnimatedComponent(Component)`                                      | Animates the props of any component.                                                                                                                                                                  |
| `Animated.Node`, `Animated.Interpolation`                                          | The classes, for types and `instanceof`.                                                                                                                                                              |

Each animation has `start(callback?)`, `stop()`, and `reset()`.

The `toValue` of `timing` and `spring` can be another `Animated` value or an interpolation. The animated value then follows it: each change starts a new animation to the new target. `stopAnimation()` or a new animation of the value ends this. `setValue()` doesn't.

`timing`, `spring`, and `decay` also animate a `ValueXY` or a `Color`: they run one animation for each channel. A `toValue` or a `velocity` with a part for each channel, such as `{ x: 100, y: 0 }` or `{ r: 255, g: 0, b: 0, a: 1 }`, gives each channel its part. Another `ValueXY` or `Color` as `toValue` makes each channel follow its own channel.

## Differences from React Native

- **No native driver.** `useNativeDriver: true` runs the same JavaScript driver. Each frame runs on the main thread, as on react-native-web.
- **Reduced motion.** When the user asks for less motion (`prefers-reduced-motion`), `timing` and `spring` go to `toValue` at once, and `decay` goes at once to the value where it would stop. A `delay` still waits, so a sequence keeps its pauses. A `loop` ends after one iteration.
- **An `{ x, y }` with a single `Animated.Value`** as the `toValue` or the `velocity` throws an error. React Native gives `NaN` frames.
- **A color that `Animated.Color` can't read** gives black, as on native. This includes CSS values such as `var(--accent)`.
- **A division by zero** logs one warning in development. React Native logs an error each time.
- **A value in a prop that isn't `style`** renders the component again on each frame. A value in `style` doesn't.
- **A value in the `style` of `Animated.FlatList` or `Animated.SectionList`** renders the list again on each frame, as React Native does on the New Architecture. To animate a list cheaply, put the value on an `Animated.View` around the list.
- **`Animated.event` always returns a function,** also with `useNativeDriver: true`. So `forkEvent` of it gives a new function.
- **`attachNativeEvent` takes only `onScroll`.** React Native attaches the values to a native event, with no JavaScript. The web listens to the `scroll` event of the element in JavaScript. Any other event name has no effect and logs a warning in development.

---
id: easing
title: Easing
description: The easing curves of React Native, for the easing option of an animation.
---

# `Easing`

The easing curves of React Native. A curve takes the time of an animation, from `0` to `1`, and returns its progress. Pass one as the `easing` option of an animation.

Each function works as in React Native, with the same math, so a curve gives the same values on the web as on a phone.

`Animated` isn't in the package yet, so call a curve yourself, or pass it to a library that takes an easing function.

```tsx
import { Easing } from 'react-native'

const curve = Easing.inOut(Easing.quad)
curve(0.25) // 0.125
```

## Curves

| Member                           | Curve                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `Easing.linear`                  | `t`                                                                                       |
| `Easing.ease`                    | `cubic-bezier(0.42, 0, 1, 1)`, as in React Native. That is CSS `ease-in`, not CSS `ease`. |
| `Easing.quad`                    | `t * t`                                                                                   |
| `Easing.cubic`                   | `t * t * t`                                                                               |
| `Easing.poly(n)`                 | `t` to the power `n`                                                                      |
| `Easing.sin`                     | A sine curve.                                                                             |
| `Easing.circle`                  | A circular curve.                                                                         |
| `Easing.exp`                     | An exponential curve. It starts at `1 / 1024`, not at `0`.                                |
| `Easing.elastic(bounciness = 1)` | A spring that moves past the end. With `0` it doesn't, and with `n` it does `n` times.    |
| `Easing.back(s = 1.70158)`       | Moves back a little before it moves forward.                                              |
| `Easing.bounce`                  | Bounces at the end.                                                                       |
| `Easing.bezier(x1, y1, x2, y2)`  | A cubic Bézier curve, as CSS `cubic-bezier()`. An `x` out of `[0, 1]` throws an error.    |
| `Easing.step0`                   | `1` for each `t` above `0`, else `0`.                                                     |
| `Easing.step1`                   | `1` for each `t` from `1` up, else `0`.                                                   |

## Helpers

| Member                 | Result                                                                         |
| ---------------------- | ------------------------------------------------------------------------------ |
| `Easing.in(easing)`    | The curve as it is.                                                            |
| `Easing.out(easing)`   | The curve turned around: fast at the start, slow at the end.                   |
| `Easing.inOut(easing)` | The curve for the first half, and the curve turned around for the second half. |

The type of a curve is `EasingFunction`, `(t: number) => number`.

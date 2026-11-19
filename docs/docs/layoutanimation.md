---
id: layoutanimation
title: LayoutAnimation
description: React Native's LayoutAnimation on the web. After configureNext, the next commit animates each element that moves and each new element.
---

# `LayoutAnimation`

React Native's `LayoutAnimation`: you call `configureNext` before a state change, and the next commit animates the layout changes.

```tsx
import { LayoutAnimation } from 'react-native'

const toggle = () => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
  setOpen((open) => !open)
}
```

## What animates

- **An element that moves** starts at its old place and moves to its new place, with the `update` config. A child that moves with its parent moves with it and has no animation of its own.
- **A new element** animates its `property` with the `create` config: `opacity` from 0 to its own opacity, or a scale from 0 (`scaleX`, `scaleY`, `scaleXY`). Its children come with it.
- The element keeps its own `transform`, for example from `Animated`. The move and the scale use the CSS `translate` and `scale` properties.

The curves are React Native's: `linear`, `easeIn`, `easeOut`, `easeInEaseOut`, and `spring` with `springDamping` (0.5 by default). `keyboard` is `linear`, as on native. Each kind takes its own `duration` and `delay`. A kind that isn't in the config doesn't animate.

If a new `configureNext` comes during an animation, each element goes on from where it is.

## API

| Member                                                                               | On the web                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LayoutAnimation.configureNext(config, onAnimationDidEnd?, onAnimationDidFail?)`     | Animates the next commit. `onAnimationDidEnd` runs once: when the animations end, or `config.duration + 17` ms later, whichever is first. A config that React Native can't read calls `onAnimationDidFail` and animates nothing. |
| `LayoutAnimation.create(duration, type?, property?)`                                 | Gives a config with `type` for `create`, `update`, and `delete`, and `property` for `create` and `delete`. As on native, a config with no `type` fails.                                                                          |
| `LayoutAnimation.Presets`                                                            | `easeInEaseOut` (300 ms), `linear` (500 ms), and `spring` (700 ms), the configs of React Native.                                                                                                                                 |
| `LayoutAnimation.easeInEaseOut(callback?)`, `linear(callback?)`, `spring(callback?)` | `configureNext` with the preset of the same name.                                                                                                                                                                                |
| `LayoutAnimation.Types`, `LayoutAnimation.Properties`                                | The names of the types (`spring`, `linear`, `easeInEaseOut`, `easeIn`, `easeOut`, `keyboard`) and of the properties (`opacity`, `scaleX`, `scaleY`, `scaleXY`).                                                                  |
| `LayoutAnimation.setEnabled(value)`                                                  | `false` turns the animations off, and `true` turns them on.                                                                                                                                                                      |
| `LayoutAnimation.checkConfig()`                                                      | Logs an error, as on native: React Native turned it off.                                                                                                                                                                         |

React Native fails a config with no `duration`, a kind with no valid `type`, or a `create` or `delete` with no valid `property`.

## Differences from React Native

- **The next commit must come before `config.duration + 17` ms.** Call `configureNext` in the same event handler as the state change. React Native keeps the config until the next commit, however late.
- **Reduced motion.** When the user asks for less motion (`prefers-reduced-motion`), nothing animates, and `onAnimationDidEnd` still runs after the duration. React Native never calls it then.
- **`setEnabled` works.** In React Native, it does nothing, because of a bug. After `setEnabled(false)`, `onAnimationDidEnd` still runs after the duration.
- **A scroll during the commit.** The old place is relative to the window. If a scroll container scrolls in the same commit, its children move by the scroll distance.
- **Cost.** `configureNext` and the commit each read the box of each element on the page: about 10 ms for 5,000 elements in Chromium on a laptop. An element that is out of the window before and after the commit doesn't animate, so a long list starts only the animations that show.

In a server render, `configureNext` does nothing and never calls `onAnimationDidEnd`.

## Not there yet

- **A change of size** shows at once. The element moves, but its box takes the new size with no animation.
- **A removed element** goes away at once, with no `delete` animation.

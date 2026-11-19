---
id: layoutanimation
title: LayoutAnimation
description: React Native's LayoutAnimation API on the web. Nothing animates yet, and the callback runs after the duration.
---

# `LayoutAnimation`

React Native's `LayoutAnimation`: you call `configureNext` before a state change, and the next layout animates.

```tsx
import { LayoutAnimation } from 'react-native'

const toggle = () => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
  setOpen((open) => !open)
}
```

**Nothing animates yet.** The next layout shows at once. Your code runs the same as on native, so you can keep the calls.

## API

| Member                                                                               | On the web                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LayoutAnimation.configureNext(config, onAnimationDidEnd?, onAnimationDidFail?)`     | Calls `onAnimationDidEnd` once, `config.duration + 17` ms later, as React Native does when the native side doesn't call it. `onAnimationDidFail` never runs, as on native for a valid config. |
| `LayoutAnimation.create(duration, type?, property?)`                                 | Gives a config with `type` for `create`, `update`, and `delete`, and `property` for `create` and `delete`.                                                                                    |
| `LayoutAnimation.Presets`                                                            | `easeInEaseOut` (300 ms), `linear` (500 ms), and `spring` (700 ms), the configs of React Native.                                                                                              |
| `LayoutAnimation.easeInEaseOut(callback?)`, `linear(callback?)`, `spring(callback?)` | `configureNext` with the preset of the same name.                                                                                                                                             |
| `LayoutAnimation.Types`, `LayoutAnimation.Properties`                                | The names of the types (`spring`, `linear`, `easeInEaseOut`, `easeIn`, `easeOut`, `keyboard`) and of the properties (`opacity`, `scaleX`, `scaleY`, `scaleXY`).                               |
| `LayoutAnimation.setEnabled(value)`                                                  | Does nothing, because nothing animates.                                                                                                                                                       |
| `LayoutAnimation.checkConfig()`                                                      | Logs an error, as on native: React Native turned it off.                                                                                                                                      |

In a server render, `configureNext` does nothing and never calls `onAnimationDidEnd`.

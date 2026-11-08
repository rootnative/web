---
id: usepressability
title: usePressability
description: The press hook behind Pressable. It returns pointer, keyboard, and focus handlers that you spread on a View.
---

# `usePressability`

The press handling behind [`Pressable`](/pressable), as a hook. Use it to build your own pressable component.

```tsx
import { useMemo } from 'react'
import { usePressability, View } from 'react-native'

export function Card({ onPress, children }) {
  const config = useMemo(() => ({ onPress }), [onPress])
  const handlers = usePressability(config)
  return (
    <View {...handlers} role="button">
      {children}
    </View>
  )
}
```

Memoize the config. A new config object on each render makes the hook configure itself again.

## Handlers

On the web, the hook returns pointer, keyboard, and focus handlers, not the responder handlers of native: `onPointerDown`, `onPointerUp`, `onPointerMove`, `onPointerCancel`, `onPointerEnter`, `onPointerLeave`, `onKeyDown`, `onKeyUp`, `onClick`, `onContextMenu`, `onFocus`, and `onBlur`. Spread them on a `View`. Their identity never changes.

A `null` config returns `null` and sets up nothing. The hook sets up when a config arrives.

## Config

| Field                                                                 | On the web                                                                                                                                                                                           |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onPress`, `onPressIn`, `onPressOut`, `onLongPress`, `onPressMove`    | As on [`Pressable`](/pressable#how-a-press-works). `onPress` gets the pointer up event, or the click event for a keyboard or assistive technology press. `preventDefault()` on it cancels the click. |
| `onHoverIn`, `onHoverOut`, `delayHoverIn`, `delayHoverOut`            | A mouse or a pen. Touch doesn't hover.                                                                                                                                                               |
| `onFocus`, `onBlur`                                                   | Focus events of the element.                                                                                                                                                                         |
| `delayPressIn`, `delayPressOut`, `delayLongPress`, `minPressDuration` | As on native. `delayLongPress` defaults to 500 ms, and `minPressDuration` to 130 ms.                                                                                                                 |
| `disabled`                                                            | Stops every press.                                                                                                                                                                                   |
| `hitSlop`, `pressRectOffset`                                          | Grow the area where a release still presses. `hitSlop` doesn't grow the hit area here: `Pressable` does that with CSS.                                                                               |
| `cancelable`                                                          | Accepted. `Pressable` turns `false` into `touch-action: none`. With the hook, set `touchAction` in the style yourself.                                                                               |
| `android_disableSound`, `blockNativeResponder`                        | Native only. Accepted and ignored.                                                                                                                                                                   |

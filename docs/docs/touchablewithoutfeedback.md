---
id: touchablewithoutfeedback
title: TouchableWithoutFeedback
description: Adds press handling to its only child, with no element and no feedback of its own.
---

# `TouchableWithoutFeedback`

Adds press handling to its only child. It renders no element of its own and shows no feedback. The press handling is the same as on [`Pressable`](/pressable#how-a-press-works).

```tsx
import { Text, TouchableWithoutFeedback, View } from 'react-native'

export function Card({ onOpen }) {
  return (
    <TouchableWithoutFeedback role="button" onPress={onOpen}>
      <View>
        <Text>Open</Text>
      </View>
    </TouchableWithoutFeedback>
  )
}
```

The child must be one element that passes its props to the DOM, for example a `View` or a `Text`. Your own component works when it passes the props on to a `View`.

## What the child gets

- The press handlers. The child's own DOM handlers run first, for example its `onPointerDown`.
- The accessibility props, `role`, `testID`, `nativeID`, `id`, and `onLayout` of the `TouchableWithoutFeedback`. `style` stays out, as on native.
- `onFocus` and `onBlur` of the `TouchableWithoutFeedback`. Without them, the child keeps its own.
- `focusable`: as on native, the child is in the tab order only with `onPress`, and not when `disabled`.

## Props

| Prop                                                | On the web                                                                                    |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `onPress`, `onPressIn`, `onPressOut`, `onLongPress` | As on [`Pressable`](/pressable). There's no minimum press duration, as on native.             |
| `delayPressIn`, `delayPressOut`, `delayLongPress`   | The press delays, in milliseconds.                                                            |
| `disabled`                                          | Sets `aria-disabled` on the child, takes it out of the tab order, and stops every press.      |
| `pressRetentionOffset`                              | As on [`Pressable`](/pressable).                                                              |
| `hitSlop`                                           | The child gets it. A `View` doesn't grow its hit area yet, so it only extends the press area. |
| `rejectResponderTermination`                        | The web ignores it: there's no element of its own to set `touch-action` on.                   |
| `touchSoundDisabled`                                | Native only. Accepted and ignored.                                                            |

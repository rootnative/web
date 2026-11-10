---
id: touchablenativefeedback
title: TouchableNativeFeedback
description: Android's ripple touchable. On the web, as on iOS, it shows no ripple and works as TouchableWithoutFeedback.
---

# `TouchableNativeFeedback`

On Android, this touchable draws the system ripple. On iOS, React Native shows no feedback, and the press works as on [`TouchableWithoutFeedback`](/touchablewithoutfeedback). The web does the same as iOS.

```tsx
import { Text, TouchableNativeFeedback, View } from 'react-native'

const ripple = TouchableNativeFeedback.Ripple('#2563eb', false)

export function Item({ onOpen }) {
  return (
    <TouchableNativeFeedback role="button" background={ripple} onPress={onOpen}>
      <View>
        <Text>Open</Text>
      </View>
    </TouchableNativeFeedback>
  )
}
```

The child gets the press handlers and the accessibility props, as with [`TouchableWithoutFeedback`](/touchablewithoutfeedback#what-the-child-gets).

## Props

| Prop                                              | On the web                                                     |
| ------------------------------------------------- | -------------------------------------------------------------- |
| `background`, `useForeground`                     | Android only. Accepted and ignored, as on iOS.                 |
| The props of `TouchableWithoutFeedback`           | As on [`TouchableWithoutFeedback`](/touchablewithoutfeedback). |
| `hasTVPreferredFocus`, `nextFocusDown` and others | TV only. Accepted and ignored.                                 |

## Static methods

| Method                                          | On the web                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `SelectableBackground(rippleRadius?)`           | Returns the same object as on native, for `background`.                                    |
| `SelectableBackgroundBorderless(rippleRadius?)` | Returns the same object as on native, for `background`.                                    |
| `Ripple(color, borderless, rippleRadius?)`      | Returns the same object as on native, with the color from [`processColor`](/processcolor). |
| `canUseNativeForeground()`                      | `false`, as on iOS.                                                                        |

:::tip The React Compiler lint and `Ripple`

The React Compiler lint reads a capitalized call in a component, such as `TouchableNativeFeedback.Ripple(...)`, as a component, and reports `capitalized-calls`. Make the call once outside the component, as in the example.

:::

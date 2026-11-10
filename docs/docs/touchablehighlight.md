---
id: touchablehighlight
title: TouchableHighlight
description: A press target that shows an underlay color behind its child while pressed, as React Native's TouchableHighlight does.
---

# `TouchableHighlight`

A press target that shows an underlay while you press it. The underlay is a background color, and the child gets a lower opacity on top of it, so the child looks darker. The press handling is the same as on [`Pressable`](/pressable#how-a-press-works).

```tsx
import { StyleSheet, Text, TouchableHighlight, View } from 'react-native'

export function Row({ onOpen }) {
  return (
    <TouchableHighlight role="button" underlayColor="#e5e7eb" onPress={onOpen}>
      <View style={styles.row}>
        <Text>Open</Text>
      </View>
    </TouchableHighlight>
  )
}

const styles = StyleSheet.create({
  row: { padding: 16, backgroundColor: 'white' },
})
```

The child must be one element that takes a `style`, for example a `View`. Give the child an opaque background color. The underlay then shows through the child as its opacity drops. Without a child background, the underlay shows at full strength, as on native.

## How the underlay works

- When a press starts, the element gets `underlayColor` as its background, and the child gets `activeOpacity`.
- When the press ends, the underlay goes away. After `onPress`, it stays for `delayPressOut` milliseconds, so a short tap still shows it.
- With no press handler (`onPress`, `onPressIn`, `onPressOut`, or `onLongPress`), there's no underlay.
- The underlay changes render the component again, as on native.

## Props

| Prop                                                                    | On the web                                                                                       |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `underlayColor`                                                         | The background while pressed. The default is black.                                              |
| `activeOpacity`                                                         | The opacity of the child while pressed. The default is `0.85`.                                   |
| `onShowUnderlay`, `onHideUnderlay`                                      | Called when the underlay shows and when it goes away.                                            |
| `testOnly_pressed`                                                      | Shows the underlay all the time.                                                                 |
| `onPress`, `onPressIn`, `onPressOut`, `onLongPress`                     | As on [`Pressable`](/pressable). There's no minimum press duration, as on native.                |
| `delayPressIn`, `delayPressOut`, `delayLongPress`                       | The press delays, in milliseconds.                                                               |
| `onFocus`, `onBlur`                                                     | Focus events of the element. On native, `TouchableHighlight` doesn't call them.                  |
| `disabled`                                                              | Sets `aria-disabled`, takes the element out of the tab order, and stops every press.             |
| `focusable`                                                             | As on native, the element is in the tab order only with `onPress`. `false` takes it out.         |
| `hitSlop`, `pressRetentionOffset`                                       | As on [`Pressable`](/pressable).                                                                 |
| `rejectResponderTermination`                                            | `true` sets `touch-action: none`, so a scroll that starts on the element can't cancel the press. |
| `onClick` and the other DOM handlers                                    | **Web only.** Your handler runs first, then the press handling.                                  |
| View props                                                              | As on [`View`](/view).                                                                           |
| `touchSoundDisabled`, `hasTVPreferredFocus`, `nextFocusDown` and others | Native only. Accepted and ignored.                                                               |

## Ref

The ref is the DOM element.

---
id: touchableopacity
title: TouchableOpacity
description: A press target that dims while pressed, with the timing and the curve of React Native's TouchableOpacity.
---

# `TouchableOpacity`

A press target that dims while you press it. It uses the timing and the curve of React Native, with the same press handling as [`Pressable`](/pressable#how-a-press-works).

```tsx
import { StyleSheet, Text, TouchableOpacity } from 'react-native'

export function SaveButton({ onSave }) {
  return (
    <TouchableOpacity role="button" onPress={onSave} style={styles.button}>
      <Text>Save</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: { padding: 12, borderRadius: 8, backgroundColor: '#e5e7eb' },
})
```

As on `Pressable`, give an action `role="button"`, so it renders a `<button type="button">`. Without a role, it renders a `<div>`.

## How it dims

- When a press starts, the opacity goes to `activeOpacity` at once.
- When the pointer leaves the press area, the opacity goes back over 250 ms. When it comes back, the opacity goes to `activeOpacity` over 150 ms.
- When the press ends, the opacity goes back to the opacity of `style` over 250 ms.
- A change of `disabled` or of the style's opacity also fades to the style's opacity over 250 ms.

The fade uses the Web Animations API, so a press doesn't render the component again. The curve is React Native's `Easing.inOut(Easing.quad)`, as `cubic-bezier(0.455, 0.03, 0.515, 0.955)`.

## Props

| Prop                                                                    | On the web                                                                                       |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `activeOpacity`                                                         | The opacity while pressed. The default is `0.2`.                                                 |
| `onPress`, `onPressIn`, `onPressOut`, `onLongPress`                     | As on [`Pressable`](/pressable). There's no minimum press duration, as on native.                |
| `delayPressIn`, `delayPressOut`, `delayLongPress`                       | The press delays, in milliseconds.                                                               |
| `onFocus`, `onBlur`                                                     | Focus events of the element. On native, `TouchableOpacity` doesn't call them.                    |
| `disabled`                                                              | Sets `aria-disabled`, takes the element out of the tab order, and stops every press.             |
| `focusable`                                                             | As on native, the element is in the tab order only with `onPress`. `false` takes it out.         |
| `hitSlop`, `pressRetentionOffset`                                       | As on [`Pressable`](/pressable).                                                                 |
| `rejectResponderTermination`                                            | `true` sets `touch-action: none`, so a scroll that starts on the element can't cancel the press. |
| `onClick` and the other DOM handlers                                    | **Web only.** Your handler runs first, then the press handling.                                  |
| View props                                                              | As on [`View`](/view).                                                                           |
| `touchSoundDisabled`, `hasTVPreferredFocus`, `nextFocusDown` and others | Native only. Accepted and ignored.                                                               |

## Ref

The ref is the DOM element.

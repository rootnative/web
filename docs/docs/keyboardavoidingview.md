---
id: keyboardavoidingview
title: KeyboardAvoidingView
description: KeyboardAvoidingView on the web. It moves out of the way of the on-screen keyboard, with the math of React Native.
---

# `KeyboardAvoidingView`

A view that moves out of the way of the on-screen keyboard, so a text field at the bottom stays in sight. It reads the keyboard from [`Keyboard`](/keyboard), and it uses the same math as React Native 0.88.

```tsx
import { KeyboardAvoidingView, ScrollView, TextInput } from 'react-native'

export function Chat() {
  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={56} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }}>{/* messages */}</ScrollView>
      <TextInput placeholder="Write a message" />
    </KeyboardAvoidingView>
  )
}
```

## Behaviors

| `behavior`   | What the view does while the keyboard covers it                                                |
| ------------ | ---------------------------------------------------------------------------------------------- |
| `'padding'`  | Adds the covered height to its `paddingBottom`.                                                |
| `'height'`   | Takes its first height less the covered height, with `flex: 0`. It gets its height back after. |
| `'position'` | Wraps the children in an inner view, and moves that view up with `bottom`.                     |
| None         | Nothing. It's a plain `View`.                                                                  |

## The math

As on native, the view finds the covered height from its own `onLayout` frame, and its `y` is relative to its parent, not to the window.

- At the top of the window, the math is exact.
- Under a header, pass the header height in `keyboardVerticalOffset`. It's the same value as on native.
- In a page that scrolls, the `y` of the view isn't its place in the window. Use it in a layout that fills the window, for example in a [`Modal`](/modal) or a root view with `flex: 1`.

## Props

| Prop                     | On the web                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `behavior`               | `'height'`, `'position'`, or `'padding'`. See the table above.                        |
| `keyboardVerticalOffset` | The distance from the top of the window to the top of the view. Defaults to 0.        |
| `enabled`                | `false` stops the view from moving. It moves again when it's enabled. Default `true`. |
| `contentContainerStyle`  | The style of the inner view, with `'position'`.                                       |
| View props               | Go to the outer view, as on [`View`](/view). `ref` gets its element.                  |

There's no animation: the view changes on the frame when the keyboard changes.

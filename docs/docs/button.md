---
id: button
title: Button
description: A button with a title and a press handler. It renders a real button element with the look of React Native's Android button.
---

# `Button`

A button with a title and a press handler. It renders a `<button type="button">`, so the keyboard and a screen reader see a real button.

```tsx
import { Button } from 'react-native'

export function SaveButton({ onSave }) {
  return <Button title="Save" onPress={onSave} />
}
```

`Button` takes no `style` and no children, as in React Native. For a different look, use [`Pressable`](/pressable) or [`TouchableOpacity`](/touchableopacity) with `role="button"`.

## How it looks

React Native draws a different button on each platform. The web uses the look of Android:

- A background of `#2196F3`, with a corner radius of 2.
- The title in white, with a weight of 500, centered, with 8 px around it.
- When disabled: a background of `#dfdfdf` and a title of `#a1a1a1`.

Two things differ from Android:

- The title keeps its case. Android makes it uppercase.
- The button has no shadow, because the web ignores `elevation`.

The button dims while you press it, as [`TouchableOpacity`](/touchableopacity#how-it-dims) does.

Inside a `View`, the button takes the full width, as on native. To make it as wide as its title, put it in a `View` with `alignItems: 'flex-start'`.

## Props

| Prop                                                                    | On the web                                                                                                   |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `title`                                                                 | The text of the button. It must be a string, or `Button` throws, as in React Native.                         |
| `onPress`                                                               | As on [`Pressable`](/pressable). Enter and Space press a focused button.                                     |
| `color`                                                                 | The background color, as on Android. On iOS, it's the color of the title.                                    |
| `disabled`                                                              | Sets `aria-disabled`, takes the button out of the tab order, stops the press, and changes the colors.        |
| `accessibilityState`, `aria-disabled`                                   | A `disabled` value in one of them also disables the button. The `disabled` prop wins.                        |
| `accessibilityLabel`, `aria-label`, `accessibilityHint`                 | As on [`View`](/view).                                                                                       |
| `aria-busy`, `aria-checked`, `aria-expanded`, `aria-selected`           | Go to the button.                                                                                            |
| `accessibilityLanguage`                                                 | Sets the `lang` attribute.                                                                                   |
| `importantForAccessibility`                                             | `no` and `no-hide-descendants` set `aria-hidden`, which hides the button and its title from a screen reader. |
| `testID`                                                                | Sets `data-testid`.                                                                                          |
| `accessible`, `accessibilityActions`, `onAccessibilityAction`           | Native only. Accepted and ignored.                                                                           |
| `touchSoundDisabled`, `hasTVPreferredFocus`, `nextFocusDown` and others | Native only. Accepted and ignored.                                                                           |

## Ref

The ref is the `<button>` element.

---
id: pressable
title: Pressable
description: Detects press, long press, hover, and focus from a mouse, a pen, touch, or the keyboard, with the React Native press timing.
---

# `Pressable`

Detects a press, a long press, hover, and focus. It works with a mouse, a pen, touch, and the keyboard, with the press timing of React Native.

```tsx
import { Pressable, StyleSheet, Text } from 'react-native'

export function SaveButton({ onSave }) {
  return (
    <Pressable
      role="button"
      onPress={onSave}
      style={({ pressed, hovered, focused }) => [
        styles.button,
        hovered && styles.hovered,
        pressed && styles.pressed,
        focused && styles.focusRing,
      ]}
    >
      <Text>Save</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: { padding: 12, borderRadius: 8, backgroundColor: '#e5e7eb' },
  hovered: { backgroundColor: '#d1d5db' },
  pressed: { backgroundColor: '#9ca3af' },
  focusRing: { outlineWidth: 2, outlineStyle: 'solid', outlineColor: '#2563eb' },
})
```

Give an action `role="button"`. It renders a `<button type="button">`, so screen readers announce a button and the browser handles the keyboard. Without a role, `Pressable` renders a focusable `<div>`.

## How a press works

- **Mouse, pen, or touch.** The primary button only. `onPressIn` fires on the pointer down, and `onPress` fires when you release inside the press area. The press area is the element, plus `hitSlop`, plus `pressRetentionOffset`.
- **Keyboard.** Enter or Space, while the `Pressable` has focus. `onPressIn` fires on key down, and `onPress` on key up. Space doesn't scroll the page. With `role="button"`, the browser handles the key, and only `onPress` fires.
- **Assistive technology, or `element.click()`.** `onPress` fires with the click event.
- **Long press.** `onLongPress` fires after `delayLongPress`, 500 ms by default. On a touch screen, a long press with `onLongPress` doesn't open the context menu.
- **Quick taps.** `onPressOut` waits until the press is at least 130 ms long, so a quick tap still shows the pressed style, as on native.
- **The click after a tap.** A browser sends a click after each tap. When the press put new content under the finger, for example a modal, that click stops, so it presses nothing else. A click on the pressed element goes through, so a link still navigates.

## State

`style` and `children` can be functions of the state:

| Field     | Meaning                                                                                                    |
| --------- | ---------------------------------------------------------------------------------------------------------- |
| `pressed` | True while a press is down.                                                                                |
| `hovered` | **Web only.** True while a mouse or a pen is over the element. Touch never sets it.                        |
| `focused` | **Web only.** True while the element has keyboard focus, so a focus ring doesn't show after a mouse click. |

As on native, only a `Pressable` whose `style` or `children` is a function renders again when the state changes.

## Props

| Prop                                                               | On the web                                                                                                                                                        |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onPress`, `onPressIn`, `onPressOut`, `onLongPress`, `onPressMove` | The event's `nativeEvent` is the DOM event with `locationX`, `locationY`, `pageX`, `pageY`, `timestamp`, `touches`, and `changedTouches` added.                   |
| `onPress`                                                          | Gets the pointer up event. A keyboard or assistive technology press gets the click event. `preventDefault()` on it cancels the click, so a link doesn't navigate. |
| `onHoverIn`, `onHoverOut`, `delayHoverIn`, `delayHoverOut`         | A mouse or a pen. Touch doesn't hover.                                                                                                                            |
| `onFocus`, `onBlur`                                                | Focus events of the element.                                                                                                                                      |
| `disabled`                                                         | Sets `aria-disabled`, takes the element out of the tab order, and stops every press.                                                                              |
| `hitSlop`                                                          | An invisible `::before` box grows the hit area. A parent with `overflow: 'hidden'` clips it.                                                                      |
| `pressRetentionOffset`                                             | How far a pointer can leave the element and still press it. The default is 20 on three sides and 30 at the bottom, as on native.                                  |
| `cancelable`                                                       | `false` sets `touch-action: none`, so a scroll that starts on the element can't cancel the press.                                                                 |
| `unstable_pressDelay`                                              | Delays `onPressIn`.                                                                                                                                               |
| `testOnly_pressed`                                                 | Forces the pressed state.                                                                                                                                         |
| `focusable`                                                        | `false` takes the element out of the tab order.                                                                                                                   |
| `onClick`, `onKeyDown`, and the other DOM handlers                 | **Web only.** Your handler runs first, then the press handling.                                                                                                   |
| View props                                                         | As on [`View`](/view).                                                                                                                                            |
| `android_ripple`, `android_disableSound`, `blockNativeResponder`   | Native only. Accepted and ignored.                                                                                                                                |

## Ref

The ref is the DOM element. It has the measure methods of [`View`](/view#ref). The type is `PressableInstance`.

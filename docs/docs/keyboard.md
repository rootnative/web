---
id: keyboard
title: Keyboard
description: Keyboard on the web. It fires keyboardDidShow and keyboardDidHide for the on-screen keyboard of a phone or a tablet, as on Android.
---

# `Keyboard`

Tells you when the on-screen keyboard of a phone or a tablet shows and hides, and how much of the window it covers. On the web it works as on Android: `keyboardDidShow` fires when the keyboard shows and when its height changes, and `keyboardDidHide` fires when it hides.

```tsx
import { useEffect, useState } from 'react'
import { Keyboard } from 'react-native'

export function useKeyboardHeight() {
  const [height, setHeight] = useState(0)
  useEffect(() => {
    const subscriptions = [
      Keyboard.addListener('keyboardDidShow', (event) => setHeight(event.endCoordinates.height)),
      Keyboard.addListener('keyboardDidHide', () => setHeight(0)),
    ]
    return () => subscriptions.forEach((subscription) => subscription.remove())
  }, [])
  return height
}
```

## How it finds the keyboard

- A browser has no keyboard event. When the keyboard shows, the browser shrinks the visual viewport, and `Keyboard` reads that.
- The keyboard counts only while a text field has the focus: a text input, a `textarea`, or an element that you can edit. A field with `readOnly` or `disabled` doesn't count.
- A pinch zoom doesn't count as a keyboard.
- An app that turns on the VirtualKeyboard API with `navigator.virtualKeyboard.overlaysContent = true` gets the rectangle of that API instead. Chrome on Android has it.
- With `interactive-widget=resizes-content` in the viewport meta tag, the browser makes the page shorter instead. Then no event fires, because nothing covers the page.

A hardware keyboard and a desktop browser give no event.

## API

| Member                                        | On the web                                                                                         |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `Keyboard.addListener('keyboardDidShow', fn)` | Calls `fn` when the keyboard shows and when its height changes. Returns `{ remove() }`.            |
| `Keyboard.addListener('keyboardDidHide', fn)` | Calls `fn` when the keyboard hides.                                                                |
| `Keyboard.addListener(otherEvent, fn)`        | Registers `fn`. It never runs. The `Will` and `ChangeFrame` events don't fire, as on Android.      |
| `Keyboard.removeAllListeners(eventType?)`     | Removes the listeners of one event, or of all events with no argument.                             |
| `Keyboard.dismiss()`                          | Takes the focus from the focused text field, so the keyboard hides. Other elements keep the focus. |
| `Keyboard.isVisible()`                        | `true` while the keyboard shows.                                                                   |
| `Keyboard.metrics()`                          | The `endCoordinates` of the keyboard while it shows, else `undefined`.                             |
| `Keyboard.scheduleLayoutAnimation(event)`     | Does nothing. The web has no layout animation, and its events have no duration.                    |

## The event

Each event has the shape of Android's event:

| Field            | On the web                                                                                                                                                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `duration`       | `0`.                                                                                                                                                                                                                                          |
| `easing`         | `'keyboard'`.                                                                                                                                                                                                                                 |
| `endCoordinates` | `screenY` is the top of the keyboard, from the top of the window. When the browser moves the page up to show the field, `screenY` moves down by the same distance. `height` is the height of the keyboard. `screenX` is 0, and `width` is the width of the window. In `keyboardDidHide`, `height` is 0 and `screenY` is the height of the window. |

The values are CSS pixels. While the keyboard moves, the browser can resize the viewport on each frame. `Keyboard` reads it once for each frame, so `keyboardDidShow` can fire a few times with a growing height.

## On the server

No event fires on the server, and `isVisible()` is `false`.

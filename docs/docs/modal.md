---
id: modal
title: Modal
description: Content over the page, on a dialog element in the browser's top layer. The page under it is inert and doesn't scroll, and Escape calls onRequestClose.
---

# `Modal`

Shows its children over the page. The modal is a `<dialog>` that opens with `showModal()`, so it's in the browser's top layer, above every `zIndex`.

```tsx
import { useState } from 'react'
import { Button, Modal, Text, View } from 'react-native'

export function Terms() {
  const [visible, setVisible] = useState(false)
  return (
    <View>
      <Button title="Read the terms" onPress={() => setVisible(true)} />
      <Modal visible={visible} onRequestClose={() => setVisible(false)}>
        <Text>…</Text>
        <Button title="Close" onPress={() => setVisible(false)} />
      </Modal>
    </View>
  )
}
```

## Show and hide

- `visible` decides, as on native. It's `true` by default.
- Escape calls `onRequestClose`. So does the back gesture of Chrome on Android. Hide the modal there, as you do for the Android back button. Without `onRequestClose`, Escape does nothing.
- While `visible` is `true`, the modal stays open. Chrome closes a dialog itself on a second Escape with no other input between, and the modal then opens again.
- `onShow` fires once each time the modal shows.
- `onDismiss` fires after the modal hides because `visible` became `false`, as on iOS. An unmount isn't a dismissal.

## Focus and the page under it

- `showModal()` makes the rest of the page inert. A click, the Tab key, and a screen reader stay inside the modal.
- The focus moves to the first element in the modal that can take it. When the modal hides, the focus goes back to the element that had it before, for example the button that opened the modal.
- The page under the modal doesn't scroll.
- A press inside the modal doesn't reach a `Pressable` around the `Modal`, as on native.
- A modal inside a modal goes on top of it. Escape closes the top one first.

## Layout

The dialog fills the viewport. Your children go in a box that fills the dialog, as on native.

- The box is white. `backdropColor` sets another color.
- `transparent` makes the box clear, so the page shows through. For a dialog look, put a dim layer and a card in it.
- `style` goes to the box.

## Server rendering

A modal renders nothing on the server. It shows after hydration, so the server HTML and the first client render are the same.

## Props

| Prop                                                                                                                                                                  | On the web                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `visible`                                                                                                                                                             | Shows the modal. `true` by default.                                                           |
| `onRequestClose`                                                                                                                                                      | Called on Escape, and on the back gesture of Chrome on Android.                               |
| `onShow`                                                                                                                                                              | Called once when the modal shows.                                                             |
| `onDismiss`                                                                                                                                                           | Called after the modal hides because `visible` became `false`. On native, only iOS calls it.  |
| `transparent`                                                                                                                                                         | The box has no background.                                                                    |
| `backdropColor`                                                                                                                                                       | The color of the box. The default is white. `transparent` wins.                               |
| `style`                                                                                                                                                               | Styles the box.                                                                               |
| `ref`, `modalRef`                                                                                                                                                     | The `<dialog>` element, while the modal shows.                                                |
| `testID`, `nativeID`, the accessibility props, the DOM handlers                                                                                                       | Go to the `<dialog>`. Give it `aria-label` or `aria-labelledby`, so a screen reader names it. |
| `animationType`                                                                                                                                                       | Not yet. The modal shows and hides at once.                                                   |
| `presentationStyle`, `supportedOrientations`, `onOrientationChange`, `allowSwipeDismissal`, `hardwareAccelerated`, `statusBarTranslucent`, `navigationBarTranslucent` | No web effect.                                                                                |

## Older browsers

Firefox before 98 and Safari before 15.4 have no `showModal()`. There the modal is a fixed box over the page, and Escape still calls `onRequestClose`. The focus moves into the modal and back, but the page under it isn't inert.

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
- `onShow` fires once each time the modal shows, when its enter animation ends.
- `onDismiss` fires after the modal hides because `visible` became `false`, when its exit animation ends, as on iOS. An unmount isn't a dismissal.

## Focus and the page under it

- `showModal()` makes the rest of the page inert. A click, the Tab key, and a screen reader stay inside the modal.
- The focus moves into the modal: to the first element that can take it, or to the dialog itself. Chrome on Android picks the dialog when a touch opened the modal. When the modal hides, the focus goes back to the element that had it before, for example the button that opened the modal.
- The page under the modal doesn't scroll.
- A press inside the modal doesn't reach a `Pressable` around the `Modal`, as on native.
- A modal inside a modal goes on top of it. Escape closes the top one first.

## Animation

- `animationType="slide"` moves the modal up from the bottom, and back down when it hides.
- `animationType="fade"` fades the modal in and out.
- `"none"`, the default, shows and hides the modal at once.

Each animation takes 200 ms, with the curves of React Native's modal on Android. The whole modal moves, as on native, also a dim layer in a transparent modal. For a dim layer that doesn't slide, use `fade`.

The modal stays on the screen until its exit animation ends, and it takes no presses then. A modal inside it closes at once. When the system asks for reduced motion, the modal shows and hides at once.

## Layout

The dialog fills the viewport. Your children go in a box that fills the dialog, as on native.

- The box is white. `backdropColor` sets another color.
- `transparent` makes the box clear, so the page shows through. For a dialog look, put a dim layer and a card in it.
- `style` goes to the box.

## Server rendering

A modal renders nothing on the server. It shows after hydration, so the server HTML and the first client render are the same.

## Props

| Prop                                                                                                                                                                  | On the web                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `visible`                                                                                                                                                             | Shows the modal. `true` by default.                                                                                    |
| `onRequestClose`                                                                                                                                                      | Called on Escape, and on the back gesture of Chrome on Android.                                                        |
| `onShow`                                                                                                                                                              | Called once when the modal shows, after its enter animation.                                                           |
| `onDismiss`                                                                                                                                                           | Called after the modal hides because `visible` became `false`, after its exit animation. On native, only iOS calls it. |
| `transparent`                                                                                                                                                         | The box has no background.                                                                                             |
| `backdropColor`                                                                                                                                                       | The color of the box. The default is white. `transparent` wins.                                                        |
| `style`                                                                                                                                                               | Styles the box.                                                                                                        |
| `ref`, `modalRef`                                                                                                                                                     | The `<dialog>` element, while the modal shows.                                                                         |
| `testID`, `nativeID`, the accessibility props, the DOM handlers                                                                                                       | Go to the `<dialog>`. Give it `aria-label` or `aria-labelledby`, so a screen reader names it.                          |
| `animationType`                                                                                                                                                       | `'none'` (the default), `'slide'`, or `'fade'`. See [Animation](#animation).                                           |
| `presentationStyle`, `supportedOrientations`, `onOrientationChange`, `allowSwipeDismissal`, `hardwareAccelerated`, `statusBarTranslucent`, `navigationBarTranslucent` | No web effect.                                                                                                         |

## Older browsers

Firefox before 98 and Safari before 15.4 have no `showModal()`. There the modal is a fixed box over the page, and Escape still calls `onRequestClose`. The focus moves into the modal and back, but the page under it isn't inert.

---
id: panresponder
title: PanResponder
description: PanResponder on pointer events, with the React Native gesture state and responder negotiation, and the scroll rule for touch screens.
---

# `PanResponder`

Tracks a drag with the React Native gesture state. On the web it runs on pointer events, so it works with a mouse, a pen, and touch.

```tsx
import { useRef } from 'react'
import { PanResponder, View } from 'react-native'

export function Draggable() {
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (event, gesture) => {
        // gesture.dx and gesture.dy since the grant
      },
    }),
  ).current

  return <View {...pan.panHandlers} style={{ width: 80, height: 80 }} />
}
```

## Scroll on a touch screen

While a responder holds the gesture, the page doesn't scroll, as on native. Return `false` from `onShouldBlockNativeResponder` to let the page scroll during the gesture.

:::warning A responder that takes the gesture on a move

A responder with only `onMoveShouldSetPanResponder` gets the gesture after the finger moves. The browser can start to scroll first, and then it ends the gesture. Put `touchAction: 'none'` in the style of the element, or `'pan-y'` for a horizontal drag inside a vertical scroll.

:::

## Handlers

`panHandlers` are six pointer handlers: `onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`, and the two capture variants. Spread them on a `View`.

When the responder takes the gesture, the element captures the pointer, so the gesture continues outside the element.

## Negotiation

One responder holds a gesture at a time, as on native. The should-set callbacks with `Capture` run from the parent to the child. The others run from the child to the parent.

When a responder asks for a gesture that another one holds, the holder's `onPanResponderTerminationRequest` decides. `true` (the default) moves the gesture: the holder gets `onPanResponderTerminate`, and the new one gets `onPanResponderGrant`. `false` keeps it, and the asker gets `onPanResponderReject`.

## Gesture state

| Field                 | On the web                                                                           |
| --------------------- | ------------------------------------------------------------------------------------ |
| `dx`, `dy`            | The distance since the grant, in CSS pixels, from the center of the active pointers. |
| `vx`, `vy`            | The speed, in pixels per millisecond.                                                |
| `x0`, `y0`            | The page position at the grant.                                                      |
| `moveX`, `moveY`      | The latest page position.                                                            |
| `numberActiveTouches` | The pointers that are down on the element.                                           |
| `stateID`             | A new number for each gesture.                                                       |

A pointer that joins or leaves doesn't move the gesture. The event's `nativeEvent` is the pointer event with `touches`, `changedTouches`, `identifier`, `locationX`, `locationY`, `pageX`, `pageY`, `timestamp`, and `force` (the pen pressure) added.

## Not on the web

- `getInteractionHandle()` returns `null`.

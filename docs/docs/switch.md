---
id: switch
title: Switch
description: An on and off control. It renders a real checkbox input with the role switch, under a track and a thumb with the look of React Native's Android switch.
---

# `Switch`

A control that is on or off. It renders a real `<input type="checkbox" role="switch">`, so the browser gives the press, the keyboard, the focus, and the label.

```tsx
import { useState } from 'react'
import { Switch } from 'react-native'

export function WifiSwitch() {
  const [on, setOn] = useState(false)
  return <Switch value={on} onValueChange={setOn} accessibilityLabel="Wi-Fi" />
}
```

## The switch shows `value`

As on native, `Switch` is a controlled component. It shows `value`, and only `true` is on.

A press calls `onChange`, then `onValueChange` with the new value. Your handler must change `value`. If it doesn't, the switch goes back to the position of `value`.

## How it looks

React Native draws a different switch on each platform. The web uses the look of Android:

- The switch is 40 px wide and 20 px high.
- Off: a track of `#939393` and a thumb of `#FAFAFA`.
- On: a track of `#A3D3CF` and a thumb of `#009688`.
- When disabled, the switch has an opacity of 0.5.

The thumb moves over 150 ms. It moves at once when the system asks for reduced motion.

In a right-to-left layout, the on position is at the left.

## Elements

`Switch` renders a root element with three parts inside: the input, the track, and the thumb. The input is transparent and covers the switch.

- `style`, `onLayout`, and `pointerEvents` go to the root. The root has `alignSelf: 'flex-start'`, as on iOS. A `width` and a `height` in `style` change the size of the switch, and the thumb is as wide as the height.
- The ref and every other prop, such as `id`, `testID`, and `accessibilityLabel`, go to the input.

Because the input has the `id`, a `<label>` works:

```tsx
<label htmlFor="wifi">Wi-Fi</label>
<Switch id="wifi" value={on} onValueChange={setOn} />
```

## Keyboard and focus

The switch is in the tab order. Space changes it. With keyboard focus, the switch shows the focus ring of the browser.

## Props

| Prop                                                                | On the web                                                                                           |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `value`                                                             | `true` is on. Every other value is off.                                                              |
| `onValueChange`                                                     | Gets the new value, after `onChange`.                                                                |
| `onChange`                                                          | Gets the change event. `nativeEvent.value` is the new value, and `nativeEvent.target` is the input.  |
| `trackColor`                                                        | `{ false, true }`: the color of the track when the switch is off and on.                             |
| `thumbColor`                                                        | The color of the thumb in both states.                                                               |
| `disabled`                                                          | Disables the input, so it leaves the tab order and doesn't change. The switch has an opacity of 0.5. |
| `accessibilityState`                                                | A `disabled` value in it also disables the switch. The `disabled` prop wins.                         |
| `role`, `accessibilityRole`                                         | The role of the input. The default is `switch`.                                                      |
| `onFocus`, `onBlur`, `onClick` and the other DOM handlers           | **Web only.** They go to the input.                                                                  |
| `style`, `onLayout`, `pointerEvents`                                | Go to the root element.                                                                              |
| View props                                                          | As on [`View`](/view). They go to the input.                                                         |
| `ios_backgroundColor`, `onTintColor`, `tintColor`, `thumbTintColor` | iOS only. Accepted and ignored, as on Android.                                                       |

## Ref

The ref is the `<input>` element. It covers the switch, so its box is the box of the switch, and `focus()` works.

---
id: vibration
title: Vibration
description: Vibration on the web, with Android's rules. Browsers with no Vibration API, such as Safari, do nothing.
---

# `Vibration`

Vibrates the device, with Android's rules.

```tsx
import { Vibration } from 'react-native'

Vibration.vibrate() // 400 ms
Vibration.vibrate([0, 200, 100, 200]) // wait 0, vibrate 200, wait 100, vibrate 200
```

## API

| Member                               | On the web                                                                                                                                                                                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Vibration.vibrate(pattern, repeat)` | A number vibrates for that many milliseconds, 400 by default. An array alternates waits and vibrations, and starts with a wait, as on Android. With `repeat`, an array plays again until `cancel()`. A new call replaces the current vibration. |
| `Vibration.cancel()`                 | Stops the vibration and the repeat.                                                                                                                                                                                                             |

A pattern that isn't a number or an array throws, as on native.

## Where it vibrates

Chrome on Android and the other browsers with the Vibration API vibrate, after the user taps the page once. Safari on iOS and on a Mac has no Vibration API, and most desktops have no motor. There, `vibrate` does nothing, as on a device with no motor.

The durations apply on the web, as on Android. On iOS, React Native ignores them and each vibration is about 400 ms.

---
id: dimensions
title: Dimensions
description: The window and screen size on the web, through Dimensions and useWindowDimensions, with font scale and server values.
---

# `Dimensions` and `useWindowDimensions`

The size of the window and the screen.

```tsx
import { useWindowDimensions } from 'react-native'

export function Columns() {
  const { width } = useWindowDimensions()
  const columns = width >= 900 ? 3 : width >= 600 ? 2 : 1
  // ...
}
```

Prefer `useWindowDimensions()` in a component. It renders again when the size changes, and it matches the server HTML during hydration.

## Values

| Field       | `window`                                                                       | `screen`                   |
| ----------- | ------------------------------------------------------------------------------ | -------------------------- |
| `width`     | The width of the viewport (`innerWidth`).                                      | The width of the display.  |
| `height`    | The height of the viewport (`innerHeight`).                                    | The height of the display. |
| `scale`     | `devicePixelRatio`.                                                            | The same.                  |
| `fontScale` | The root font size divided by 16, the user's font-size setting in the browser. | The same.                  |

## API

| Member                                      | On the web                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------------- |
| `useWindowDimensions()`                     | The `window` values. Renders again on a change.                                    |
| `Dimensions.get('window')`, `get('screen')` | The current values.                                                                |
| `Dimensions.addEventListener('change', fn)` | Calls `fn` with `{ window, screen }` when a value changes. Returns `{ remove() }`. |

The browser reports a change on `resize`. A zoom that changes `devicePixelRatio` resizes the viewport too, so it counts.

## On the server

On the server, both return `{ width: 0, height: 0, scale: 1, fontScale: 1 }`. `useWindowDimensions()` also returns these zeros during hydration, then the real size. `Dimensions.get()` returns the real size in the browser at once, so don't read it in render. See [Server rendering](/server-rendering#values-that-differ-on-the-server).

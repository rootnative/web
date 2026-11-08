---
id: stylesheet
title: StyleSheet
description: StyleSheet.create, flatten, compose, absoluteFill, and hairlineWidth on the web.
---

# `StyleSheet`

Creates and combines styles, as on native. See [Styles](/styles) for how a style becomes CSS.

```tsx
import { StyleSheet } from 'react-native'

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
})
```

| Member                          | On the web                                                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `StyleSheet.create(styles)`     | Returns the same objects, frozen. A frozen style compiles to CSS once, so prefer it for every static style. |
| `StyleSheet.flatten(style)`     | Merges a style array into one object. Later entries win.                                                    |
| `StyleSheet.compose(a, b)`      | `[a, b]` when both are set, else the one that is set.                                                       |
| `StyleSheet.absoluteFill`       | `{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }`, frozen.                                   |
| `StyleSheet.absoluteFillObject` | The same object. Spread it into a style to add more properties.                                             |
| `StyleSheet.hairlineWidth`      | `1`. The browser draws one CSS pixel at device resolution, so a thinner value isn't needed.                 |

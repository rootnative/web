---
id: compat
title: Compat exports
description: Three exports that libraries import from react-native on the web - unstable_createElement, findNodeHandle, and TurboModuleRegistry.
---

# Compat exports

Three exports that exist for libraries, not for your app. A library such as `react-native-svg` or `react-native-safe-area-context` imports them from `react-native` on the web. Without them, the library doesn't load.

**Don't call them in app code.** Use a `ref` to get an element, and the components of this package to render one.

## `unstable_createElement`

`unstable_createElement(type, props)` renders an element from React Native props. React Native itself doesn't have this export. It comes from `react-native-web`, and libraries rely on it.

```tsx
import { unstable_createElement } from 'react-native'

unstable_createElement('path', { d: 'M0 0L10 10', style: { opacity: 0.5 } })
```

| Prop                                                               | Result                                            |
| ------------------------------------------------------------------ | ------------------------------------------------- |
| `style`                                                            | Compiles to class names, as on [`View`](/view).   |
| `className`                                                        | Stays, in front of the class names of `style`.    |
| `accessibilityLabel`, `testID`, `nativeID`, `focusable`, and so on | Become ARIA and DOM attributes, as on `View`.     |
| `onPress` and the responder handlers                               | Dropped. Pass a DOM handler such as `onClick`.    |
| `ref`, `key`, `children`                                           | Work as in React. The `ref` gets the DOM element. |
| Every other prop                                                   | Goes to the element as it is, for example `d`.    |

The element gets no style reset. A `div` from this function is a plain `div`, not a `View`.

## `findNodeHandle`

On native, `findNodeHandle` returns the number of a view. On the web, it returns the DOM element.

| Input                                           | Result                 |
| ----------------------------------------------- | ---------------------- |
| A `ref` object                                  | Its element, or `null` |
| A DOM element                                   | The same element       |
| A [`ScrollView`](/scrollview) or `FlatList` ref | The scroll element     |
| A number                                        | The same number        |
| A class component instance                      | `null`                 |
| `null`, `undefined`, or any other value         | `null`                 |

A class component instance gives `null`, because React 19 can't find the element of a component.

## `TurboModuleRegistry`

A browser has no native modules.

- `TurboModuleRegistry.get(name)` returns `null` for every name.
- `TurboModuleRegistry.getEnforcing(name)` throws an error with the name.

A library that reads its native module when it loads gets `null`, and then takes its JavaScript path.

## `@rootnative/web/assets-registry`

An entry with `registerAsset` and `getAssetByID`, the two functions of `@react-native/assets-registry/registry`. The [Vite plugin](/vite-plugin) points that module name at this entry, because `react-native-svg` imports it on the web. A web bundler gives an image import a URL, not a number, so the registry stays empty.

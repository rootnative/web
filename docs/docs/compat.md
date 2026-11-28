---
id: compat
title: Compat exports
description: The exports and entries that libraries such as react-native-svg, react-native-safe-area-context, and Reanimated import on the web.
---

# Compat exports

Exports and entries that exist for libraries, not for your app. `react-native-svg`, `react-native-safe-area-context`, and Reanimated import them on the web. Without them, these libraries don't load.

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

| Input                                                               | Result                 |
| ------------------------------------------------------------------- | ---------------------- |
| A `ref` object                                                      | Its element, or `null` |
| A DOM element                                                       | The same element       |
| A [`ScrollView`](/scrollview), `FlatList`, or `VirtualizedList` ref | The scroll element     |
| A number                                                            | The same number        |
| A class component instance                                          | `null`                 |
| `null`, `undefined`, or any other value                             | `null`                 |

A class component instance gives `null`, because React 19 can't find the element of a component.

## `TurboModuleRegistry`

A browser has no native modules.

- `TurboModuleRegistry.get(name)` returns `null` for every name.
- `TurboModuleRegistry.getEnforcing(name)` throws an error with the name.

A library that reads its native module when it loads gets `null`, and then takes its JavaScript path.

## Types

Two types that the type files of a library import from `react-native`:

| Type                    | What it is                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `TurboModule`           | The base type of a native module spec.                                              |
| `HostComponent<Config>` | The type of a component from a native component spec. Its `ref` is a host instance. |

## `@rootnative/web/assets-registry`

An entry with `registerAsset` and `getAssetByID`, the two functions of `@react-native/assets-registry/registry`. In a React Native app with no Expo, on [`@rootnative/web-metro`](/react-native-cli), Metro registers each image that the app requires here, and [`Image`](/image#local-images) loads an asset id from its entry. The [Vite plugin](/vite-plugin) points that module name at this entry, because `react-native-svg` imports it on the web. Vite gives an image import a URL, not a number, so with Vite the registry stays empty.

## `@rootnative/web/style`

An entry with the style helpers that Reanimated 4 imports from two `react-native-web` internal files. The [Vite plugin](/vite-plugin) points both file names at this entry. Reanimated then animates `View`, `Text`, `Image`, and `ScrollView` from this package.

| Export                            | Result                                                                                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createReactDOMStyle(style)`      | The inline DOM style of a React Native style, with the same rules as the class names of `View`. Also the default export, as in `react-native-web`. |
| `createTransformValue(transform)` | The CSS `transform` value of a `transform` array. An empty string for no valid transform.                                                          |
| `createTextShadowValue(style)`    | The CSS `text-shadow` value of `textShadowColor`, `textShadowOffset`, and `textShadowRadius`.                                                      |

In `createReactDOMStyle`, shorthands such as `margin` come before longhands such as `marginLeft`. A library that writes the values one at a time then gets the longhand, as on native.

Reanimated on the web needs its Worklets Babel plugin, or a dependency array on each hook. Without the plugin, list the shared values that a hook reads:

```tsx
const style = useAnimatedStyle(() => ({ opacity: progress.value }), [progress])
```

## Props from react-native-web

Two props that only react-native-web has. Libraries written for react-native-web send them, for example the `Link` of Expo Router. The types don't declare them.

| Prop        | Result                                                                                                                                                                                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hrefAttrs` | With `href` on a `View` or a `Text`, its `target`, `rel`, and `download` go to the `<a>`. A `target` with no leading `_` gets one: `blank` becomes `_blank`. A `target`, `rel`, or `download` prop wins over it. Without `href`, it does nothing.                 |
| `dataSet`   | Each key becomes a `data-*` attribute. A capital letter becomes `-` and the lower case letter: `fooBar` gives `data-foo-bar`. A `null` or `undefined` value adds nothing. A `data-*` prop with the same name wins over it. It works wherever `data-*` props work. |

In your own code, use the `target`, `rel`, and `download` props of [`Text`](/text), and `data-*` props.

react-native-web also maps flat accessibility props, such as `accessibilityDisabled`, to ARIA attributes. React Native doesn't have them, so this package drops them. In development, a warning names the `aria-*` prop to use, for example `aria-disabled`.

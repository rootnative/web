---
id: status
title: Status
description: What @rootnative/web ships today, what's planned, what's out of scope, and how it's tested.
---

# Status

`@rootnative/web` is in early alpha. The API can change between alpha releases. This page lists what exists, so nothing on this site reads as a promise.

The latest release is [`0.0.0-alpha.0`](https://www.npmjs.com/package/@rootnative/web) on npm. The [changelog](https://github.com/rootnative/web/blob/main/packages/web/CHANGELOG.md) lists the changes in each release.

## What ships today

| Group      | Exports                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Components | [`View`](/view), [`Text`](/text), [`Image`](/image), [`Pressable`](/pressable), [`ScrollView`](/scrollview), [`FlatList`](/flatlist), [`TextInput`](/textinput), [`StatusBar`](/statusbar)                                                                                                                                                                                                                                           |
| APIs       | [`StyleSheet`](/stylesheet), [`Platform`](/platform), [`Dimensions`](/dimensions), [`useWindowDimensions`](/dimensions), [`Appearance`](/appearance), [`useColorScheme`](/appearance), [`AccessibilityInfo`](/accessibilityinfo), [`I18nManager`](/i18nmanager), [`BackHandler`](/backhandler), [`PixelRatio`](/pixelratio), [`processColor`](/processcolor), [`PanResponder`](/panresponder), [`usePressability`](/usepressability) |
| Web layer  | [`Head`](/seo), from `@rootnative/web/dom`                                                                                                                                                                                                                                                                                                                                                                                           |
| Server     | `createStyleRegistry`, `StyleRegistryProvider`, `renderStyleTags`, `styleTagsHTML`, `StyleRegistry`, from `@rootnative/web/server`. See [Server rendering](/server-rendering).                                                                                                                                                                                                                                                       |

`FlatList` renders every item. It has no virtualizer yet, so keep long lists short for now.

## Planned, not written

**Don't import these yet.** They aren't in the package.

- **Components:** `Button`, `ActivityIndicator`, `Switch`, `RefreshControl`, `Modal`, `TouchableOpacity`, `TouchableHighlight`, `TouchableWithoutFeedback`, `TouchableNativeFeedback`.
- **Text press events:** `onPressIn`, `onPressOut`, and `onLongPress` on `Text`. `onPress` works today.
- **APIs:** `Alert`, `AppState`, `Linking`, `Share`, `Vibration`, `Clipboard`.
- **Lists and motion:** a virtualizer for `FlatList`, `SectionList`, `VirtualizedList`, `Animated`, and `LayoutAnimation`.
- **Tooling:** a Vite plugin that sets the `react-native` alias, resolves `.web.tsx` files, and inlines `Platform.OS`. Until then, use the alias on [Installation](/installation).

## Out of scope

- The `react-native-web` internals and file layout.
- Expo and Metro. A Metro plugin isn't planned for 1.0.
- React 18, CommonJS, and Flow.
- Props that React Native doesn't have, except a small web-only set. Each page marks a web-only prop.

## How it's tested

Every component and API has tests. They run in a real Chromium browser through Vitest browser mode, not in a simulated DOM.

Firefox and Safari aren't in the test run yet.

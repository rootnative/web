---
id: status
title: Status
description: What @rootnative/web ships today, what's planned, what's out of scope, and how it's tested.
---

# Status

`@rootnative/web` is in early alpha. The API can change between alpha releases. This page lists what exists, so nothing on this site reads as a promise.

The latest release is [`0.0.0-alpha.6`](https://www.npmjs.com/package/@rootnative/web) on npm. The [changelog](https://github.com/rootnative/web/blob/main/packages/web/CHANGELOG.md) lists the changes in each release.

## What ships today

| Group      | Exports                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Components | [`View`](/view), [`Text`](/text), [`Image`](/image), [`Pressable`](/pressable), [`TouchableHighlight`](/touchablehighlight), [`TouchableNativeFeedback`](/touchablenativefeedback), [`TouchableOpacity`](/touchableopacity), [`TouchableWithoutFeedback`](/touchablewithoutfeedback), [`Button`](/button), [`ScrollView`](/scrollview), [`FlatList`](/flatlist), [`VirtualizedList`](/virtualizedlist), [`SectionList`](/sectionlist), [`VirtualizedSectionList`](/sectionlist#virtualizedsectionlist), [`RefreshControl`](/refreshcontrol), [`TextInput`](/textinput), [`Switch`](/switch), [`ActivityIndicator`](/activityindicator), [`Modal`](/modal), [`KeyboardAvoidingView`](/keyboardavoidingview), [`StatusBar`](/statusbar)                                                                                      |
| APIs       | [`StyleSheet`](/stylesheet), [`Platform`](/platform), [`Dimensions`](/dimensions), [`useWindowDimensions`](/dimensions), [`Appearance`](/appearance), [`useColorScheme`](/appearance), [`AppState`](/appstate), [`Keyboard`](/keyboard), [`Linking`](/linking), [`Alert`](/alert), [`Share`](/share), [`Vibration`](/vibration), [`Clipboard`](/clipboard), [`AccessibilityInfo`](/accessibilityinfo), [`I18nManager`](/i18nmanager), [`BackHandler`](/backhandler), [`PixelRatio`](/pixelratio), [`processColor`](/processcolor), [`PanResponder`](/panresponder), [`Animated`](/animated), [`useAnimatedValue`](/animated), [`useAnimatedValueXY`](/animated), [`useAnimatedColor`](/animated), [`Easing`](/easing), [`LayoutAnimation`](/layoutanimation) (nothing animates yet), [`usePressability`](/usepressability) |
| Compat     | [`unstable_createElement`](/compat), [`findNodeHandle`](/compat), [`TurboModuleRegistry`](/compat), and the entries `@rootnative/web/assets-registry` and `@rootnative/web/style`. Libraries import them, your app doesn't.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Web layer  | [`Head`](/seo), from `@rootnative/web/dom`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Server     | `createStyleRegistry`, `StyleRegistryProvider`, `renderStyleTags`, `styleTagsHTML`, `StyleRegistry`, from `@rootnative/web/server`. See [Server rendering](/server-rendering).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Tooling    | [`rootnative()`](/vite-plugin), the Vite plugin, from `@rootnative/web/vite`, and [`@rootnative/web-expo`](/expo), for an Expo app, also with Expo Router                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

## Planned, not written

**Don't import these yet.** They aren't in the package.

- **Tooling:** a Next.js plugin, and templates for a Vite app with and without server rendering.

## Out of scope

- The `react-native-web` internals. Only `@rootnative/web-expo` has its file layout, for Expo's bundler.
- Metro with no Expo. A Metro plugin isn't planned for 1.0.
- React 18, CommonJS, and Flow.
- Props that React Native doesn't have, except a small web-only set. Each page marks a web-only prop.

## How it's tested

Every component and API has tests. They run in real browsers through Vitest browser mode, not in a simulated DOM: Chromium, Firefox, and WebKit, the engine of Safari.

# Changelog

All notable changes to `@rootnative/web` are in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow modified semver: a breaking change bumps the middle digit (`0.1.0`), and fixes and additions bump the last digit (`0.0.2`).

## [Unreleased]

### Fixed

- **`hrefAttrs` on a `View` or a `Text` with `href`** now sets `target`, `rel`, and `download` on the `<a>`, as on react-native-web. Before, the prop was dropped, so an Expo Router `<Link target="_blank">` opened in the same tab. A `target` with no leading `_` gets one, and a direct `target`, `rel`, or `download` prop wins. `unstable_createElement` maps it too. See [Compat exports](https://rootnative.github.io/web/compat#props-from-react-native-web).

## [0.0.1] - 2026-11-21

The first stable release. A React Native app runs in the browser as a real web app, with semantic HTML, atomic CSS, server rendering, and SEO tags. [Status](https://rootnative.github.io/web/status) lists what ships, and each docs page says what differs from iOS and Android.

### Added

- **Components:** `View`, `Text`, `Image`, `Pressable`, `TouchableHighlight`, `TouchableNativeFeedback`, `TouchableOpacity`, `TouchableWithoutFeedback`, `Button`, `ScrollView`, `FlatList`, `VirtualizedList`, `SectionList`, `VirtualizedSectionList`, `RefreshControl`, `TextInput`, `Switch`, `ActivityIndicator`, `Modal`, `KeyboardAvoidingView`, and `StatusBar`.
- **APIs:** `StyleSheet`, `Platform`, `Dimensions`, `useWindowDimensions`, `Appearance`, `useColorScheme`, `AppState`, `Keyboard`, `Linking`, `Alert`, `Share`, `Vibration`, `Clipboard`, `AccessibilityInfo`, `I18nManager`, `BackHandler`, `PixelRatio`, `processColor`, `PanResponder`, `Easing`, `LayoutAnimation`, and `usePressability`.
- **`Animated`**, with all of React Native's API and the hooks `useAnimatedValue`, `useAnimatedValueXY`, and `useAnimatedColor`. With `useNativeDriver: true`, a `timing` or a `spring` that moves only `transform` and `opacity` runs on the Web Animations API. See [Animated](https://rootnative.github.io/web/animated).
- **`Head`** from `@rootnative/web/dom`, for the tags in `<head>`. See [SEO](https://rootnative.github.io/web/seo).
- **Server rendering** with `react-dom/server` and no helper. Each component puts its CSS into the HTML as React 19 style elements, and the page hydrates with no second copy of a rule. See [Server rendering](https://rootnative.github.io/web/server-rendering).
- **For libraries:** `unstable_createElement`, `findNodeHandle`, `TurboModuleRegistry`, and the entries `@rootnative/web/assets-registry` and `@rootnative/web/style`. See [Compat exports](https://rootnative.github.io/web/compat).
- **The Vite plugin**, `rootnative()` from `@rootnative/web/vite`. It resolves `react-native` to this package, resolves `.web` files first, defines `__DEV__`, and puts `'web'` in place of `Platform.OS`. Its `worklets` option runs the Babel plugin of `react-native-worklets`, for Reanimated. It resolves `expo-font` to a module that throws, so a project with Expo installed still builds. See [Vite plugin](https://rootnative.github.io/web/vite-plugin).

[unreleased]: https://github.com/rootnative/web/compare/web@0.0.1...HEAD
[0.0.1]: https://github.com/rootnative/web/releases/tag/web@0.0.1

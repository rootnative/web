# Changelog

All notable changes to `@rootnative/web` are in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow modified semver: a breaking change bumps the middle digit (`0.1.0`), and fixes and additions bump the last digit (`0.0.2`).

## [Unreleased]

## [0.0.5] - 2026-11-23

### Added

- **The Vite plugin loads the fonts of the icon sets of `@react-native-vector-icons`.** The package loads a font only through Expo, so with no Expo each icon was an empty box until the app added a `FontFace`. Now the plugin adds the font of each icon set to the page. See [Icon fonts](https://rootnative.github.io/web/vite-plugin#icon-fonts).
- **`SafeAreaView`**, deprecated, as in React Native, with its warning. A view with padding from the safe-area insets of the browser on each physical side. A padding in `style` wins. See [SafeAreaView](https://rootnative.github.io/web/safeareaview).
- **`InputAccessoryView`**. It renders nothing and warns, as on Android. See [InputAccessoryView](https://rootnative.github.io/web/inputaccessoryview).
- **`ImageBackground`**, as in React Native: a view with an image that fills it, under its children, with the `imageStyle` and `imageRef` props. See [ImageBackground](https://rootnative.github.io/web/imagebackground).

## [0.0.4] - 2026-11-23

### Fixed

- **A style value that moves no longer adds a CSS rule for each value.** Before, each new value of a style from React state got a rule that stayed for the life of the page: one drag of a slider thumb added 236 rules. Now, in the browser, a longhand property gets a class for its first 64 values, and a new value after that goes into the `style` attribute of the element. A value that has its class keeps it, a shorthand always gets a class, and a server render writes only classes, so hydration doesn't change. See [Styles](https://rootnative.github.io/web/styles).

## [0.0.3] - 2026-11-23

No change in the runtime. This version ships with `@rootnative/web-expo` `0.0.3`, which adds the Metro helper `withRootNative` and fixes `expo-system-ui` on the web.

### Changed

- **The Expo part of `llms.txt`** describes `withRootNative`, and says that an app without react-native-web keeps `react-dom`. It also says that `expo-system-ui` works and `@expo/html-elements` doesn't. See [Expo](https://rootnative.github.io/web/expo).

## [0.0.2] - 2026-11-22

### Added

- **`inert` and `suppressHydrationWarning`** on `View` and `Text`. Both pass to the element, as on react-native-web. Before, they were dropped, so React reported a hydration error for a `Text` that shows the time. See [Server rendering](https://rootnative.github.io/web/server-rendering#values-that-differ-on-the-server).
- **A development warning for a flat accessibility prop of react-native-web**, such as `accessibilityDisabled`. React Native doesn't have these props, so this package drops them. The warning names the `aria-*` prop to use, for example `aria-disabled`.

### Fixed

- **`hrefAttrs` on a `View` or a `Text` with `href`** now sets `target`, `rel`, and `download` on the `<a>`, as on react-native-web. Before, the prop was dropped, so an Expo Router `<Link target="_blank">` opened in the same tab. A `target` with no leading `_` gets one, and a direct `target`, `rel`, or `download` prop wins. `unstable_createElement` maps it too. See [Compat exports](https://rootnative.github.io/web/compat#props-from-react-native-web).
- **`dataSet`** now becomes `data-*` attributes, as on react-native-web: `{ fooBar: 'x' }` gives `data-foo-bar="x"`. Before, the prop was dropped, so an element that a library marked with it had no attribute, also in the server HTML. A `data-*` prop with the same name wins. See [Compat exports](https://rootnative.github.io/web/compat#props-from-react-native-web).

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

[unreleased]: https://github.com/rootnative/web/compare/web@0.0.5...HEAD
[0.0.5]: https://github.com/rootnative/web/releases/tag/web@0.0.5
[0.0.4]: https://github.com/rootnative/web/releases/tag/web@0.0.4
[0.0.3]: https://github.com/rootnative/web/releases/tag/web@0.0.3
[0.0.2]: https://github.com/rootnative/web/releases/tag/web@0.0.2
[0.0.1]: https://github.com/rootnative/web/releases/tag/web@0.0.1

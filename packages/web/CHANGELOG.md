# Changelog

All notable changes to `@rootnative/web` are in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Before `1.0.0`, any release can have breaking changes. Each release lists them.

## [Unreleased]

### Added

- **`AppState`**: `active` while the page is visible, `background` while it's hidden or unloads. `change` fires on `visibilitychange` and `pagehide`, and `blur` and `focus` fire when the browser window loses or gets the focus, as on Android. There's no `inactive` state.
- **`EventSubscription`**, the type of the object that `addEventListener` returns.

## [0.0.0-alpha.2] - 2026-11-11

### Added

- **`ActivityIndicator`**: a spinner with `animating`, `color` (default `#999999`), `hidesWhenStopped`, and `size` (`small`, `large`, or a number). It has the role `progressbar`.
- **`Button`**: a `<button type="button">` with the `title`, on `TouchableOpacity`. It has the look of the Android button, `color` sets the background, and the title keeps its case.
- **`Switch`**: a checkbox input with the role `switch` under a drawn track and thumb, with `value`, `onValueChange`, `onChange`, `trackColor`, `thumbColor`, and `disabled`. It has the look of the Android switch.
- **`TouchableHighlight`**: shows `underlayColor` (default black) behind its child and gives the child `activeOpacity` (default `0.85`) while pressed, with `onShowUnderlay` and `onHideUnderlay`.
- **`TouchableNativeFeedback`**: works as on iOS, with no ripple. `SelectableBackground`, `SelectableBackgroundBorderless`, and `Ripple` return the objects of React Native, and `canUseNativeForeground()` is `false`.
- **`TouchableOpacity`**: dims to `activeOpacity` (default `0.2`) while pressed, with React Native's timing and curve, through the Web Animations API.
- **`TouchableWithoutFeedback`**: gives its only child the press handlers and its accessibility props, with no element of its own.
- **`Text` press events:** `onPressIn`, `onPressOut`, `onLongPress`, and `pressRetentionOffset`, on the same press responder as `Pressable`. `suppressHighlighting` is ignored, as on Android.

### Changed

- A pressable `Text` has the role `link` and is in the tab order, as on native, so Enter and Space press it. A `Text` is pressable with `onPress` or `onLongPress`, and not `disabled`.
- **Breaking:** `Text` presses as `Pressable` does: `onPress` fires on the pointer release and gets a `GestureResponderEvent`. `preventDefault()` in `onClick` no longer stops `onPress`: both run, `onClick` first.
- `PressEvent` is now the same type as `GestureResponderEvent`, and it's deprecated.

### Fixed

- **`__DEV__` in a production build.** The Vite plugin of `0.0.0-alpha.1` set `__DEV__` to `true` in each build, also in production. It's now `false` in a production build.
- **Development warnings on a production server.** A server render with `NODE_ENV=production` logged the development warnings. It no longer does.

## [0.0.0-alpha.1] - 2026-11-10

### Added

- **Vite plugin** from `@rootnative/web/vite`. Add `rootnative()` to `plugins` in `vite.config.ts`. It needs Vite 8, an optional peer dependency. The plugin:
  - resolves `react-native` to `@rootnative/web`,
  - resolves `Button.web.tsx` before `Button.tsx`,
  - defines `__DEV__`,
  - puts `'web'` in place of each `Platform.OS` read, so the minifier drops the code of the other platforms.
- **`__DEV__`**, the React Native global: `true` in a development build, `false` in a production build. The Vite plugin defines it, also for pre-bundled dependencies, and the package types declare it.

### Changed

- The package README and `llms.txt` set up an app with the Vite plugin.

### Notes

- The hand-written `react-native` alias from `0.0.0-alpha.0` still works. To use the plugin, remove the alias and add `rootnative()`. [Vite plugin](https://rootnative.github.io/web/vite-plugin) also shows a setup without the plugin.
- In server rendering, a dependency that Vite leaves to Node gets no `__DEV__` and throws a `ReferenceError`. Add that dependency to `ssr.noExternal`.

## [0.0.0-alpha.0] - 2026-11-10

The first alpha. It runs a React Native app in the browser with the components and APIs below. [Status](https://rootnative.github.io/web/status) lists what's planned and what's out of scope.

### Added

- **Components:** `View`, `Text`, `Image`, `Pressable`, `ScrollView`, `FlatList`, `TextInput`, and `StatusBar`.
- **APIs:** `StyleSheet`, `Platform`, `Dimensions`, `useWindowDimensions`, `Appearance`, `useColorScheme`, `AccessibilityInfo`, `I18nManager`, `BackHandler`, `PixelRatio`, `processColor`, `PanResponder`, and `usePressability`.
- **Semantic HTML.** The `role` prop picks the HTML element, so a React Native tree renders as landmarks, headings, lists, and links. `href` on a `View` or a `Text` renders a link.
- **Atomic CSS.** Each style declaration becomes one shared CSS class, with the React Native defaults, units, flex rules, and shorthand order.
- **Server rendering** from `@rootnative/web/server`. One style registry per request collects the CSS, and the browser adopts that CSS when it hydrates.
- **SEO** with `Head` from `@rootnative/web/dom`: the title, meta tags, Open Graph tags, and JSON-LD.
- **`llms.txt`** in the package. It describes the API of this version for AI agents.

### Notes

- `FlatList` renders every item. It has no virtualizer yet, so load a long list in pages with `onEndReached`.
- `marginLeft`, `paddingLeft`, `left`, and their right partners don't swap in a right-to-left layout, as they do on native. Use the start and end props.
- There's no Vite plugin yet. Set the `react-native` alias by hand, as [Installation](https://rootnative.github.io/web/installation) shows.
- The tests run in Chromium. Firefox and Safari aren't in the test run yet.

[unreleased]: https://github.com/rootnative/web/compare/web@0.0.0-alpha.2...HEAD
[0.0.0-alpha.2]: https://github.com/rootnative/web/releases/tag/web@0.0.0-alpha.2
[0.0.0-alpha.1]: https://github.com/rootnative/web/releases/tag/web@0.0.0-alpha.1
[0.0.0-alpha.0]: https://github.com/rootnative/web/releases/tag/web@0.0.0-alpha.0

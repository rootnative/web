# Changelog

All notable changes to `@rootnative/web` are in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Before `1.0.0`, any release can have breaking changes. Each release lists them.

## [Unreleased]

### Added

- **`AppState`**: `active` while the page is visible, `background` while it's hidden or unloads. `change` fires on `visibilitychange` and `pagehide`, and `blur` and `focus` fire when the browser window loses or gets the focus, as on Android. There's no `inactive` state.
- **`Linking`**: `openURL` opens a URL of your site in this tab, a URL of another site in a new tab, and `mailto:`, `tel:`, and other schemes through the system. It rejects `javascript:` and `data:`, and a new tab that the browser blocks. `getInitialURL` returns the URL that the page loaded with. The browser never fires the `url` event, because your router owns the URL. `openSettings` and `sendIntent` reject.
- **`Share`**: opens the browser's share sheet with the title, the message, and the URL. A closed sheet resolves `dismissedAction`. A browser with no share sheet rejects with `Unsupported platform`.
- **`Vibration`**: vibrates with Android's rules: a number is milliseconds, and an array starts with a wait. `repeat` plays an array until `cancel()`. A browser with no Vibration API, such as Safari, does nothing.
- **`Clipboard`**: `setString` and `getString` through the async Clipboard API. `setString` falls back to a hidden text field on a page with no Clipboard API, and `getString` rejects when the browser refuses. It's deprecated in React Native, so the first call logs a warning.
- **`RefreshControl`**: pull to refresh with touch, with Android's indicator: an arc on a white disc that comes down from the top. A release past the target calls `onRefresh`. `colors`, `progressBackgroundColor`, `size`, `progressViewOffset`, and `enabled` work. A mouse or a keyboard has no pull. In a flipped scroller, such as an inverted `FlatList`, the pull goes up from the bottom, as on native.
- **`FlatList`** pull to refresh: `onRefresh` and `refreshing` wrap the scroller in a `RefreshControl`, with `progressViewOffset`, as on native. With `onRefresh`, `refreshing` must be a boolean, or the list throws.
- **`Modal`**: a `<dialog>` that opens with `showModal()`, so it's above the page, and the page under it is inert and doesn't scroll. Escape calls `onRequestClose`, the focus moves in and back to the opener, and a nested modal goes on top. `animationType` slides or fades the modal in and out in 200 ms, as on Android, and the modal stays until its exit animation ends. `transparent`, `backdropColor`, `onShow`, and `onDismiss` work. It renders nothing on the server and shows after hydration.
- **`EventSubscription`**, the type of the object that `addEventListener` returns.
- **`Alert`**: `Alert.alert` shows a `<dialog role="alertdialog">` with the look of Android's alert, outside the React tree. Escape presses the `cancel` button, a `cancelable` alert also closes on Escape or a click outside and calls `onDismiss`, `destructive` text is red, and the dark scheme follows `Appearance` or `userInterfaceStyle`. `Alert.prompt` does nothing yet.
- **Compat exports** for libraries that import them from `react-native` on the web: `unstable_createElement` renders an element from React Native props, `findNodeHandle` returns the DOM element of a ref, and `TurboModuleRegistry.get` returns `null`. `react-native-svg` and `react-native-safe-area-context` need them.
- **`@rootnative/web/assets-registry`**, an entry with `registerAsset` and `getAssetByID`. The Vite plugin resolves `@react-native/assets-registry/registry` to it, because `react-native-svg` imports that module on the web.
- **`Keyboard`**: as on Android, `keyboardDidShow` fires when the on-screen keyboard shows and when its height changes, and `keyboardDidHide` fires when it hides. It reads the keyboard from the visual viewport while a text field has the focus, or from the VirtualKeyboard API when the app sets `overlaysContent`. `dismiss`, `isVisible`, and `metrics` work.
- **`KeyboardAvoidingView`**, with the math of React Native 0.88: `padding`, `height`, and `position`, `keyboardVerticalOffset`, `enabled`, and `contentContainerStyle`.
- **`@rootnative/web/style`**, an entry with `createReactDOMStyle`, `createTransformValue`, and `createTextShadowValue`. The Vite plugin resolves the two `react-native-web` files that Reanimated 4 imports to it, so Reanimated animates the components of this package.
- The Vite plugin defines `global` as `globalThis`, as Metro does. Reanimated and Worklets read it.

### Changed

- A `ScrollView` with `refreshControl` gives the control the style props that place the box, and the scroller fills it, as on Android. Before, the scroller kept the whole style.

### Fixed

- `flex: 1` now grows and shrinks from a size of 0, as the docs say. Before, the defaults of `View` (`flexShrink: 0`, `flexBasis: 'auto'`) won over it, so a `flex: 1` view grew to its content and a `ScrollView` in it didn't scroll. Any style now wins over the defaults of `View`, `Text`, `TextInput`, and `Image`. The same fix makes `fontWeight` and the other font props work in a nested `Text`.
- The server renders three `<style>` elements now: the defaults of the components come first. Render all three with `renderStyleTags` or `styleTagsHTML`.
- The Vite plugin now gives the dependency optimizer the `.web` extensions too. Before, a pre-bundled library loaded its native file where it had a `.web.js` file, and the dev server stopped on `react-native-safe-area-context`.
- A tap that put a new pressable under the finger, for example in a modal that it opened, pressed that pressable too in Chrome on Android. The click of the tap now stops when it lands outside the pressed element.

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

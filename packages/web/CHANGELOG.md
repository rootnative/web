# Changelog

All notable changes to `@rootnative/web` are in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow modified semver: a breaking change bumps the middle digit (`0.1.0`), and fixes and additions bump the last digit (`0.0.2`).

## [Unreleased]

### Added

- **`disableIntervalMomentum` on a `ScrollView`.** With a finger, a pen, or the mouse wheel, the scroll stops at the next snap offset. Before, the prop had no effect.

### Fixed

- **A fling on a `ScrollView` with `snapToInterval`, `snapToOffsets`, or `pagingEnabled` ends on a snap offset, as on native.** Before, the list snapped only after the scroll settled. So a fling went on, stopped, and then scrolled back to a snap offset. Now, while a finger, a pen, or the mouse wheel moves the list, the browser's own scroll snap stops the scroll on a snap offset. After a keyboard scroll, a drag of the scrollbar, or `scrollTo`, the list snaps when the scroll settles, as before. `snapToOffsets` with `snapToStart={false}` or `snapToEnd={false}` always snaps that way. See [ScrollView](https://rootnative.github.io/web/scrollview#props).
- **A quick spin of the mouse wheel on a snapping `ScrollView` is one scroll.** The wheel scrolls in steps, and a browser can fire `scrollend` after each step. Before, the list snapped after each step. So a spin of steps shorter than half the interval went back each time, and the list didn't move. Now a scroll with the wheel ends when no wheel event comes for 150 ms, and `onMomentumScrollEnd` comes once. See [ScrollView](https://rootnative.github.io/web/scrollview#scroll-events).
- **A `ScrollView` snaps again when a wheel or a touch interrupts the smooth scroll of its snap.** Before, the list could stop between two snap points, because the settle at the end of the user's scroll counted as the end of the snap.
- **`role` and `accessibilityRole` on a `TextInput` reach the element.** Before, the field had no `role` attribute, so a `role="searchbox"` or a `role="combobox"` field was a plain text box to a screen reader. The field keeps its `<input>` or `<textarea>`. See [Semantic HTML](https://rootnative.github.io/web/semantic-html#roles-that-pick-an-element).
- **In a right-to-left layout, a horizontal `ScrollView` snaps to the nearest snap offset after a keyboard scroll, a drag of the scrollbar, or `scrollTo`.** Before, the list went back to its start after each of these scrolls, because the snap read the scroll offset as a left-to-right one.

## [0.0.8] - 2026-11-24

### Fixed

- **An `onKeyDown` that calls `preventDefault()` on Enter or Space stops the key press of a `Pressable`, as in the DOM.** Before, the press came anyway. An app that presses on Space itself, because react-native-web presses only on Enter for most roles, then pressed two times: once in its handler on key down, and again on key up. A checkbox or a switch with such a handler changed two times and kept its value. Now the handler owns the key. The same applies to `usePressability`. See [Pressable](https://rootnative.github.io/web/pressable#how-a-press-works).
- **A Jest test with jsdom can render `onLayout`, `onContentSizeChange`, and the lists.** jsdom has no `ResizeObserver`, and no `scrollTo` on an element. Before, these threw on mount there: a `View` or a `Text` with `onLayout`, a `KeyboardAvoidingView`, a `TextInput` with `onContentSizeChange`, a `ScrollView` with a `ref`, and each `FlatList`, `SectionList`, and `VirtualizedList`. Now, without `ResizeObserver`, `onLayout` doesn't fire, and `onContentSizeChange` reports one time on mount. Without `scrollTo`, a scroll does nothing. See [Tests](https://rootnative.github.io/web/expo#tests).

## [0.0.7] - 2026-11-24

### Fixed

- **In a `Modal` or an `Alert` on iOS Safari, `keyboardDidShow` fires once for each show.** Safari moves the page up to show the focused field, and the scroll lock of the modal moves it back. Before, `Keyboard` reported both states, so the event fired two times, the first one with a keyboard that covers nothing. Now the state after the scroll back is the only one. If that scroll doesn't come, the moved state is reported after 250 ms.

## [0.0.6] - 2026-11-24

### Fixed

- **An `Image` that fails to load leaves the box empty, as on native.** Before, the browser drew its broken-image icon in the box, and the `alt` text over it. Now the `<img>` hides, and the box carries `role="img"` and the label, so the image keeps its accessible name. A new `source` shows the image again. The same applies while a source with `headers` loads. See [Image](https://rootnative.github.io/web/image).
- **An `Image` that completes before React attaches `onLoad` and has a natural width of 0 fires `onLoad`, not `onError`.** This is a cached image, or one that loaded from the server HTML before hydration. Before, a natural width of 0 counted as broken, but a loaded image can have one: for example, a 1 px image that a `width` in a source list scales down. Now a second image of the same URL, from the cache, tells if it's broken.
- **A `PanResponder` that takes the gesture on a move can say yes after any distance, as on native.** Before, the browser started its own pan after a small move (16 px in Chromium), and a responder that said yes later got `pointercancel`. That was true also for a horizontal drag on a page that scrolls only vertically, so the element needed `touchAction`. Now, until the responder decides, the browser doesn't pan for one finger, unless the page or a scroll container around the element scrolls along the move. Then the browser gets the touch, as a scroll view does on native. See [PanResponder](https://rootnative.github.io/web/panresponder#scroll-on-a-touch-screen).
- **A tap outside a focused `TextInput` keeps the keyboard open, as on native.** Before, the browser moved the focus on each tap, so the keyboard hid, also for a tap on a `Pressable`. Now a touch or a pen tap keeps the focus in the field, and the tap still reaches what it lands on. Inside a `ScrollView`, `keyboardShouldPersistTaps` decides, as on native: `'never'` (the default) lets the tap blur the field, `'handled'` keeps the focus when a pressable or a responder takes the tap, and `'always'` keeps it. With `'never'`, the tap still reaches its target, where native uses the first tap only to hide the keyboard. A mouse click keeps the browser's rule. See [TextInput](https://rootnative.github.io/web/textinput#a-tap-outside-the-field).
- **A `PanResponder` no longer makes each touch scroll of the page wait for the main thread.** Before, the first responder added a `touchmove` listener to the document that wasn't passive, so the browser asked the page before each touch scroll, also far from any responder, and a busy page started to scroll late. Now only the element with the pan handlers has the listener: a `View` or a `Text` adds it when it mounts, and another element with its first touch.
- **`hitSlop` no longer makes the first layout load a font that no text uses.** The hit area of `Pressable`, `TouchableOpacity`, and `TouchableHighlight` is an invisible `::before` box, and its empty content is a line of text, so the browser needs its font. On a `<button>`, that was the browser's default font for buttons, which the page loaded only for this box: about 2 ms of the first layout in Chromium. The box now has the font of a default `Text`.

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

[unreleased]: https://github.com/rootnative/web/compare/web@0.0.8...HEAD
[0.0.8]: https://github.com/rootnative/web/releases/tag/web@0.0.8
[0.0.7]: https://github.com/rootnative/web/releases/tag/web@0.0.7
[0.0.6]: https://github.com/rootnative/web/releases/tag/web@0.0.6
[0.0.5]: https://github.com/rootnative/web/releases/tag/web@0.0.5
[0.0.4]: https://github.com/rootnative/web/releases/tag/web@0.0.4
[0.0.3]: https://github.com/rootnative/web/releases/tag/web@0.0.3
[0.0.2]: https://github.com/rootnative/web/releases/tag/web@0.0.2
[0.0.1]: https://github.com/rootnative/web/releases/tag/web@0.0.1

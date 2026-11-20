# Changelog

All notable changes to `@rootnative/web` are in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Before `1.0.0`, any release can have breaking changes. Each release lists them.

## [Unreleased]

### Added

- **`VirtualizedList`**, React Native's list that renders only a window of its items, with the same rules. The first render has `initialNumToRender` cells. Then the list adds `maxToRenderPerBatch` cells at a time, until the window covers `windowSize` viewports, and a spacer holds the place of the other cells. It reads the data through `getItem` and `getItemCount`, so the data can be any collection. With `getItemLayout`, the list measures no cell. Without it, one `ResizeObserver` measures the rendered cells. `scrollToIndex`, `onScrollToIndexFailed`, viewability, the edge callbacks, sticky headers, and horizontal right-to-left work as on native. A server render has the first `initialNumToRender` cells. See [VirtualizedList](https://rootnative.github.io/web/virtualizedlist).
- **`SectionList` and `VirtualizedSectionList`**, on top of `VirtualizedList`, with React Native's rules: a header and a footer for each section, `renderItem` for each section, `ItemSeparatorComponent` between the items of a section, `SectionSeparatorComponent` around them, `stickySectionHeadersEnabled`, and `scrollToLocation`. As on Android, the section headers don't stick by default. The types `SectionListProps`, `SectionListData`, `SectionListRenderItem`, `SectionListRenderItemInfo`, `SectionListInstance`, `SectionBase`, `ScrollToLocationParamsType`, `VirtualizedSectionListProps`, and `VirtualizedSectionListInstance` come with them. See [SectionList](https://rootnative.github.io/web/sectionlist).
- **`maintainVisibleContentPosition`** on `ScrollView` and the lists, as on native: after a content change, the scroll offset moves as far as the first visible child at or after `minIndexForVisible` moved, so that child stays in place. `autoscrollToTopThreshold` scrolls to the start when the offset was near it. In a list, items added at the start move the window by their count. With the prop, the browser's own scroll anchoring is off. Before, the prop did nothing. See [ScrollView](https://rootnative.github.io/web/scrollview).
- **Nested lists**, as on native: a list in a cell of a list with the same direction renders a `View` with no scroller of its own, and the outer list scrolls both. The outer list sends the inner list its scroll events, and renders its cells only up to the first cell whose inner list has more items. A list of the other direction keeps its own scroller. A list in a `Modal` isn't nested in a list outside it. A list in a plain `ScrollView` of the same direction logs a warning. See [VirtualizedList](https://rootnative.github.io/web/virtualizedlist#nested-lists).
- **More of `Animated`**, with React Native's rules: `decay`, `sequence`, `delay`, `stagger`, `loop`, `subtract`, `divide`, `modulo`, and `diffClamp`. A division by zero gives 0 and logs one warning in development. With reduced motion, `decay` goes at once to the value where it would stop, and a `loop` ends after one iteration. The types `DecayAnimationConfig`, `AnimatedSubtraction`, `AnimatedDivision`, `AnimatedModulo`, and `AnimatedDiffClamp` come with them, and `Animated.Numeric` has each node with a number output. See [Animated](https://rootnative.github.io/web/animated).
- **An `Animated` value or interpolation as the `toValue`** of `timing` and `spring`: the value follows it, and each change starts a new animation to the new target. `stopAnimation()` or a new animation of the value ends this, and `stopTracking()` too. Before, such a `toValue` threw an error. See [Animated](https://rootnative.github.io/web/animated).
- **`Animated.ValueXY` and `Animated.Color`**, and the hooks `useAnimatedValue`, `useAnimatedValueXY`, and `useAnimatedColor`, with React Native's rules. `timing`, `spring`, and `decay` run one animation for each channel of a `ValueXY` or a `Color`, and `Animated.event` sets a `ValueXY` from an `{ x, y }` of the event. A color that `Animated.Color` can't read gives black, as on native. An `{ x, y }` as the `toValue` or the `velocity` of a single `Animated.Value` throws an error, where React Native gives `NaN` frames. See [Animated](https://rootnative.github.io/web/animated).
- **The rest of `Animated`:** `Animated.Image`, `Animated.ScrollView`, `Animated.FlatList`, `Animated.SectionList`, `forkEvent`, `unforkEvent`, and `attachNativeEvent`. With them, all of React Native's `Animated` API is there. `Animated.ScrollView` with a `refreshControl` gives the layout part of an animated style to the refresh control, as on Android. `attachNativeEvent` takes only `onScroll`: a `scroll` listener on the element sets the values. A value in the style of an animated list renders the list again on each frame. See [Animated](https://rootnative.github.io/web/animated).
- **`LayoutAnimation`**, React Native's API. After `configureNext`, the next commit animates each element that moves, from its old place, each box that grows, with a clip from its old size, each new element, with its `create` property (`opacity`, or a scale from 0), and each removed element, which stays at its old place and animates its `delete` property before it goes away. React Native's curves, `springDamping`, and the `duration` and `delay` of each kind apply. `onAnimationDidEnd` runs once, when the animations end or `duration + 17` ms later, and a config that React Native can't read calls `onAnimationDidFail`. With reduced motion, nothing animates and `onAnimationDidEnd` still runs. `setEnabled` works, unlike React Native's. A box that shrinks takes its new size at once. `create`, `Presets`, the `easeInEaseOut`, `linear`, and `spring` shortcuts, `Types`, `Properties`, `checkConfig`, and the types `LayoutAnimationConfig`, `LayoutAnimationAnim`, `LayoutAnimationType`, `LayoutAnimationTypes`, `LayoutAnimationProperty`, and `LayoutAnimationProperties` are there. See [LayoutAnimation](https://rootnative.github.io/web/layoutanimation).
- **`useNativeDriver: true` on the Web Animations API.** A `timing` or a `spring` whose value moves only `transform` and `opacity` runs as one Web Animation for each element, which the browser plays also while the main thread is busy. During the animation, the value gives the value of the current frame, and its listeners get each frame. At the end, and at a stop, the value goes into the inline style. Two values on one element, such as the `x` and `y` of a `ValueXY`, share one Web Animation. Any other animation runs on the JavaScript driver, as before. In development, a style key, a transform, or an `interpolate` option that React Native's native driver can't move logs React Native's error, such as `Style property 'width' is not supported by native animated module`. See [Animated](https://rootnative.github.io/web/animated#usenativedriver).

### Changed

- **Breaking: an animation with `useNativeDriver: false` throws on a value that moved to the native side before**, with React Native's error. A value moves with an animation with `useNativeDriver: true`, with `useNativeDriver: true` in the config of `Animated.Value`, `Animated.ValueXY`, or `Animated.Color`, or under `nativeEvent` in the mapping of a native `Animated.event` or of `attachNativeEvent`. The error: `Attempting to run JS driven animation on animated node that has been moved to "native" earlier by starting an animation with useNativeDriver: true`. On native, such code throws too. Before, both kinds of animation ran on the same value. Use one kind for each value.
- **`ListRenderItem` returns any React node**, as in React Native's types. Before, it returned only an element or `null`.
- **The listener of `addListener` on an `Animated` node** gets a value of any type, as in React Native's types, because a `ValueXY` gives `{ x, y }`. `Animated.Value` keeps `{ value: number }`. Before, each node typed it as `{ value: number }`.
- **Breaking: a `Text` inside a `View` inside a `Text` starts from the defaults of a `Text`**, as on native. Before, it took the font, color, alignment, and decoration of the outer `Text`. The parent element, not a React context, now tells a nested `Text` from the others. So a nested `Text` has the class `rn-text`, and the class `rn-text-nested` is gone.

- **Breaking: `FlatList` renders a window of its items**, on top of `VirtualizedList`, as on native. Before, it rendered every item. What changes for your app:
  - A long list mounts faster, and an item outside the window unmounts, so keep its state in the item data or in a store.
  - A server render has only the first `initialNumToRender` items, 10 by default. When every item must be in the HTML, set `initialNumToRender` to the item count.
  - `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, `updateCellsBatchingPeriod`, `disableVirtualization`, and `getItemLayout` now work. Before, the list ignored them.
  - Without `getItemLayout`, `scrollToIndex` to an item that isn't measured yet calls `onScrollToIndexFailed`, or throws when the list has no `onScrollToIndexFailed`. Before, the list measured every item. `initialScrollIndex` then has nothing above its item until the items above it render.
  - As on native, these throw: `columnWrapperStyle` with one column, both `onViewableItemsChanged` and `viewabilityConfigCallbackPairs`, and a change of `numColumns`, `viewabilityConfig`, `viewabilityConfigCallbackPairs`, or of whether `onViewableItemsChanged` is set.
  - With no `renderItem` and no `ListItemComponent`, the cells are empty, as on native. Before, the list threw.
  - `ListEmptyComponent` gets the flip of `inverted` in its own `style`, as on native, not in a wrapper `View`.
  - `setNativeProps` on the ref writes the style on the scroll element. Before, it did nothing.

### Fixed

- **The client no longer inserts a second copy of a server-rendered rule** whose selector goes past its class name, such as the rule of `selectionColor`.

## [0.0.0-alpha.6] - 2026-11-18

The first part of React Native's `Animated` API, and `Easing`. With them, Expo Router runs on this runtime, through `@rootnative/web-expo`.

### Added

- **`Animated`**, on the JavaScript driver: `Animated.Value` with `interpolate`, `add`, `multiply`, `timing`, `spring`, `parallel`, `event`, `Animated.View`, `Animated.Text`, and `createAnimatedComponent`. A frame writes the new style to the element, with no React render. `useNativeDriver: true` runs the same driver. With reduced motion, `timing` and `spring` go to their end at once, after their `delay`. `toValue` takes only a number. `ValueXY`, `sequence`, `loop`, and the rest of the API come later. See [Animated](https://rootnative.github.io/web/animated).
- **`Easing`**, with every curve and helper of React Native and the same math: `linear`, `ease`, `quad`, `cubic`, `poly`, `sin`, `circle`, `exp`, `elastic`, `back`, `bounce`, `bezier`, `step0`, `step1`, `in`, `out`, and `inOut`. The type `EasingFunction` comes with it.

## [0.0.0-alpha.5] - 2026-11-15

Two changes make each render after the first one cheaper. On one app, the runtime's own script time while a menu or a dialog opens and closes is about half of what it was in `0.0.0-alpha.4`. The first load doesn't change.

### Changed

- **A render of `View`, `Text`, `TextInput`, and `Image` is faster.** Each render resolved the default style of the component again, and then didn't use the result. Now it resolves once. On one app, a menu opens 16 % faster and a dialog 8 % faster.
- **A style object that you make during a render,** such as `{ color: theme.text }` or `[styles.row, { opacity }]`, now compiles once for each set of values. Before, only a style from `StyleSheet.create` did, and any other style compiled again on each render. On the same app, a dialog opens 7 % faster again. A style with a `transform`, or with another value that isn't a string or a number, still compiles each time. The cache uses a little memory: about 2 % more heap on that app.

## [0.0.0-alpha.4] - 2026-11-15

### Added

- **`@rootnative/web-expo`**, a new package that runs an Expo app with no router on this runtime, in place of react-native-web. It releases with this package, at the same version. See [Expo](https://rootnative.github.io/web/expo).
- **The `pointer` cursor** on a `Pressable`, `TouchableOpacity`, `TouchableHighlight`, and `Button` that isn't `disabled`, and on a pressable `Text`, as on react-native-web. A `cursor` in your style wins.

### Changed

- **Breaking:** a `View` with `flexWrap: 'wrap'` packs its lines at the start, as on native. The `View` reset had no `alignContent`, so the browser's `normal` stretched the lines over the free space. The reset now has `alignContent: 'flex-start'`, the default of React Native. To keep the old layout, set `alignContent: 'stretch'`.
- **The package has one file for each module**, in place of one bundled file. Metro has no tree shaking, so an Expo app loaded every component, also the ones it never imports. Through `@rootnative/web-expo`, an app now loads only the modules that it uses. Vite already dropped the unused code, so a Vite app doesn't change.
- **`@rootnative/web/internal/*.js`**, a new entry for `@rootnative/web-expo`. It has no stable API, so don't import it in your app.
- **A style array, such as `[styles.row, styles.active]`,** now compiles once when each object in it comes from `StyleSheet.create`. Before, an array compiled again on each render, and `Text` always made an array. An array with an inline object still compiles on each render, as before.

### Fixed

- **An `on*` prop that React DOM doesn't know** no longer reaches the element. A library can spread its own callback, such as `onValueChange`, onto a `View`. React Native ignores it, and React logged `Unknown event handler property` for it. `View`, `Text`, `Image`, `TextInput`, `Switch`, and `Modal` now pass only the event handlers of React DOM, such as `onClick` and `onKeyDown`.
- **A `Text` with `numberOfLines`** is no wider than its parent now, also with `flexShrink: 0`, as on native. Before, a one-line `Text` that couldn't shrink grew past its parent in a row and showed no ellipsis. A one-line `Text` also gets `overflow-wrap: normal` in place of `break-word`, which has no use on one line.

## [0.0.0-alpha.3] - 2026-11-14

### Added

- **`AppState`**: `active` while the page is visible, `background` while it's hidden or unloads. `change` fires on `visibilitychange` and `pagehide`, and `blur` and `focus` fire when the browser window loses or gets the focus, as on Android. There's no `inactive` state.
- **`Linking`**: `openURL` opens a URL of your site in this tab, a URL of another site in a new tab, and `mailto:`, `tel:`, and other schemes through the system. It rejects `javascript:` and `data:`, and a new tab that the browser blocks. `getInitialURL` returns the URL that the page loaded with. The browser never fires the `url` event, because your router owns the URL. `openSettings` and `sendIntent` reject.
- **`Share`**: opens the browser's share sheet with the title, the message, and the URL. A closed sheet resolves `dismissedAction`. A browser with no share sheet rejects with `Unsupported platform`.
- **`Vibration`**: vibrates with Android's rules: a number is milliseconds, and an array starts with a wait. `repeat` plays an array until `cancel()`. A browser with no Vibration API, such as Safari, does nothing.
- **`Clipboard`**: `setString` and `getString` through the async Clipboard API. `setString` falls back to a hidden text field on a page with no Clipboard API, and `getString` rejects when the browser refuses. It's deprecated in React Native, so the first call logs a warning.
- **`RefreshControl`**: pull to refresh with touch, with Android's indicator: an arc on a white disc that comes down from the top. A release past the target calls `onRefresh`. `colors`, `progressBackgroundColor`, `size`, `progressViewOffset`, and `enabled` work. A mouse or a keyboard has no pull. In a flipped scroller, such as an inverted `FlatList`, the pull goes up from the bottom, as on native.
- **`FlatList`** pull to refresh: `onRefresh` and `refreshing` wrap the scroller in a `RefreshControl`, with `progressViewOffset`, as on native. With `onRefresh`, `refreshing` must be a boolean, or the list throws.
- **`Modal`**: a `<dialog>` that opens with `showModal()`, so it's above the page, and the page under it is inert and doesn't scroll. Escape calls `onRequestClose`, the focus moves in and back to the opener, and a nested modal goes on top. `animationType` slides or fades the modal in and out in 200 ms, as on Android, and the modal stays until its exit animation ends. `transparent`, `backdropColor`, `onShow`, and `onDismiss` work. It stays in place when the keyboard opens, also in Safari on iOS, which moves the page up for a focused field. It renders nothing on the server and shows after hydration.
- **`EventSubscription`**, the type of the object that `addEventListener` returns.
- **`Alert`**: `Alert.alert` shows a `<dialog role="alertdialog">` with the look of Android's alert, outside the React tree. Escape presses the `cancel` button, a `cancelable` alert also closes on Escape or a click outside and calls `onDismiss`, `destructive` text is red, and the dark scheme follows `Appearance` or `userInterfaceStyle`. `Alert.prompt` does nothing yet.
- **Compat exports** for libraries that import them from `react-native` on the web: `unstable_createElement` renders an element from React Native props, `findNodeHandle` returns the DOM element of a ref, and `TurboModuleRegistry.get` returns `null`. `react-native-svg` and `react-native-safe-area-context` need them.
- **`@rootnative/web/assets-registry`**, an entry with `registerAsset` and `getAssetByID`. The Vite plugin resolves `@react-native/assets-registry/registry` to it, because `react-native-svg` imports that module on the web.
- **`Keyboard`**: as on Android, `keyboardDidShow` fires when the on-screen keyboard shows and when its height changes, and `keyboardDidHide` fires when it hides. It reads the keyboard from the visual viewport while a text field has the focus, or from the VirtualKeyboard API when the app sets `overlaysContent`. When the browser moves the page up to show the field, as Safari on iOS does, `screenY` moves down by the same distance. `dismiss`, `isVisible`, and `metrics` work.
- **`KeyboardAvoidingView`**, with the math of React Native 0.88: `padding`, `height`, and `position`, `keyboardVerticalOffset`, `enabled`, and `contentContainerStyle`.
- **`@rootnative/web/style`**, an entry with `createReactDOMStyle`, `createTransformValue`, and `createTextShadowValue`. The Vite plugin resolves the two `react-native-web` files that Reanimated 4 imports to it, so Reanimated animates the components of this package.
- The Vite plugin defines `global` as `globalThis`, as Metro does. Reanimated and Worklets read it.
- **Style types** of React Native 0.88: `ViewStyle`, `TextStyle`, `ImageStyle`, `ColorValue`, `DimensionValue`, `BoxShadowValue`, `CursorValue`, `DropShadowValue`, `EdgeInsetsValue`, `FilterFunction`, `FontVariant`, `NativeColorValue`, `OpaqueColorValue`, `PointValue`, and `TransformsStyle`.
- **Event and instance types**: `TargetedEvent`, `PointerEvent`, `AccessibilityActionEvent`, `HostInstance`, and `ViewInstance`. A focus handler typed with `NativeSyntheticEvent<TargetedEvent>` fits the `onFocus` of each component.
- **Host methods** on the ref of `View`, `Text`, `Image`, `TextInput`, `ScrollView`, `Pressable`, and the touchables: `measure`, `measureInWindow`, `measureLayout`, and `setNativeProps({ style })`. Each one calls its callback at once, with the box from `getBoundingClientRect()`. The new types are `HostMethods`, `TextInstance`, `ImageInstance`, `MeasureOnSuccessCallback`, `MeasureInWindowOnSuccessCallback`, and `MeasureLayoutOnSuccessCallback`.
- **`rootnative({ worklets: true })`**: the Vite plugin runs the Babel plugin of `react-native-worklets` on your code and on the libraries that have worklets, also in the dependency optimizer. Reanimated needs it, and so does a library built on Reanimated. The app needs `react-native-worklets` and `@babel/core`, which are optional peer dependencies now.
- **Compat types** `TurboModule` and `HostComponent`, which the type files of libraries import from `react-native`.

### Changed

- **Breaking:** the `ref` of a host component has the type `HostInstance`, which is the element plus the measure methods. A ref typed as `useRef<HTMLElement>(null)` is now a type error. Use `useRef<ViewInstance>(null)`, as on native.
- **Breaking:** the `style` props take React Native's style types, not any object, and `StyleSheet.create` checks each key and value, as on native. A CSS property that React Native doesn't have is now a type error, except `touchAction`. It still works at runtime. See [Styles](https://rootnative.github.io/web/styles#types).
- A `ScrollView` with `refreshControl` gives the control the style props that place the box, and the scroller fills it, as on Android. Before, the scroller kept the whole style.
- The props types that React Native declares as interfaces are interfaces here too: `ViewProps`, `TextProps`, `TextInputProps`, `ImageProps`, `PressableProps`, `ScrollViewProps`, `FlatListProps`, `SwitchProps`, `ButtonProps`, `ActivityIndicatorProps`, `RefreshControlProps`, `TouchableHighlightProps`, `TouchableWithoutFeedbackProps`, `KeyboardAvoidingViewProps`, and `AccessibilityProps`. A library can add a prop with `declare module 'react-native'`. Before, such a library replaced the whole type, and `style` and `testID` were missing from the props of every library.
- **Left and right styles swap in a right-to-left layout**, as on native: `left`, `right`, `marginLeft`, `paddingLeft`, the left and right borders and corners, and their partners. They compile to logical CSS properties now, so the CSS of a left-to-right page has other property names and class names, with the same layout. `I18nManager.swapLeftAndRightInRTL(false)` keeps them on the physical side. Before, the flag had no effect.

### Fixed

- `flex: 1` now grows and shrinks from a size of 0, as the docs say. Before, the defaults of `View` (`flexShrink: 0`, `flexBasis: 'auto'`) won over it, so a `flex: 1` view grew to its content and a `ScrollView` in it didn't scroll. Any style now wins over the defaults of `View`, `Text`, `TextInput`, and `Image`. The same fix makes `fontWeight` and the other font props work in a nested `Text`.
- The server renders three `<style>` elements now: the defaults of the components come first. Render all three with `renderStyleTags` or `styleTagsHTML`.
- The Vite plugin now gives the dependency optimizer the `.web` extensions too. Before, a pre-bundled library loaded its native file where it had a `.web.js` file, and the dev server stopped on `react-native-safe-area-context`.
- A tap that put a new pressable under the finger, for example in a modal that it opened, pressed that pressable too in Chrome on Android. The click of the tap now stops when it lands outside the pressed element.
- `pointerEvents: 'box-none'` and `'box-only'` now work in a `style`, as the prop does. Before, they became CSS with no effect, so a full-size layer of a library took every click of the page under it. A child of a `box-none` view keeps its own `pointerEvents`.
- A `PanResponder` that holds the gesture stops the scroll of the page on a touch screen, as on native. Before, a drag that wasn't straight scrolled the page and ended the gesture, unless the element had `touchAction: 'none'`. `onShouldBlockNativeResponder` works now: return `false` to let the page scroll.
- A `PanResponder` inside a `Pressable` keeps the pointer now. Before, the `Pressable` took the pointer capture, so the responder got the grant but no move and no release. A responder that takes the pointer on a move ends the press of a `Pressable` inside it, as on native, and a `Pressable` that takes the start isn't followed by a start of the responder around it.

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

[unreleased]: https://github.com/rootnative/web/compare/web@0.0.0-alpha.6...HEAD
[0.0.0-alpha.6]: https://github.com/rootnative/web/releases/tag/web@0.0.0-alpha.6
[0.0.0-alpha.5]: https://github.com/rootnative/web/releases/tag/web@0.0.0-alpha.5
[0.0.0-alpha.4]: https://github.com/rootnative/web/releases/tag/web@0.0.0-alpha.4
[0.0.0-alpha.3]: https://github.com/rootnative/web/releases/tag/web@0.0.0-alpha.3
[0.0.0-alpha.2]: https://github.com/rootnative/web/releases/tag/web@0.0.0-alpha.2
[0.0.0-alpha.1]: https://github.com/rootnative/web/releases/tag/web@0.0.0-alpha.1
[0.0.0-alpha.0]: https://github.com/rootnative/web/releases/tag/web@0.0.0-alpha.0

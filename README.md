# @rootnative/web

A standalone web runtime for React Native apps. You write `react-native`. It runs in the browser as a real web app.

> **Status: early alpha.** The package is not on npm yet. The API below is what the repository builds today. See [Supported APIs](#supported-apis) for the exact list.

## Why

[react-native-web](https://github.com/necolas/react-native-web) tracks React Native and stops there. This project starts from the browser and asks a different question: what does a React Native app need to be a good web app?

- **Parity first.** Every `react-native` export we ship behaves as it does on iOS and Android.
- **Web second, behind the same API.** Semantic HTML, SEO, server rendering, DOM events, logical CSS properties, and every browser capability that native lacks.
- **Modern only.** TypeScript, ESM, React 19. No Flow, no CommonJS, no `findDOMNode`, no `forwardRef`.

## How it works

| Layer  | Import                   | Content                                                          |
| ------ | ------------------------ | ---------------------------------------------------------------- |
| Parity | `@rootnative/web`        | React Native components and APIs                                 |
| Web    | `@rootnative/web/dom`    | Browser features that native does not have, for example `<Head>` |
| Server | `@rootnative/web/server` | Server rendering helpers                                         |

Your app imports `react-native`. A bundler alias maps that name to `@rootnative/web`.

### Semantic HTML

`role` picks the HTML element. No extra props.

```tsx
<View role="main">
  <View role="navigation" />
  <Text role="heading" aria-level={1}>
    Title
  </Text>
  <View role="list">
    <View role="listitem">
      <Text>One</Text>
    </View>
  </View>
  <Text href="/about" role="link">
    About
  </Text>
</View>
```

```html
<main>
  <nav></nav>
  <h1>Title</h1>
  <ul>
    <li><span>One</span></li>
  </ul>
  <a href="/about">About</a>
</main>
```

### Styles

Styles compile to atomic CSS classes at runtime. One class per declaration, shared across the app.

- Numbers get `px`. Colors normalize with the same parser as React Native.
- `flex: 1` means `1 1 0%`, as on native. `flex: 0` keeps the intrinsic size.
- `marginStart`, `paddingEnd`, `start`, `end`, and `borderTopStartRadius` map to logical CSS properties, so RTL works through the browser.
- `boxShadow`, `filter`, `mixBlendMode`, `display: 'contents'`, `position: 'static'`, `gap`, and `inset` pass through.
- A longhand always wins over a shorthand, whatever the key order, as on native.

### Server rendering

```tsx
import { renderToString } from 'react-dom/server'
import { createStyleRegistry, StyleRegistryProvider, styleTagsHTML } from '@rootnative/web/server'

const registry = createStyleRegistry()
const body = renderToString(
  <StyleRegistryProvider registry={registry}>
    <App />
  </StyleRegistryProvider>,
)
const html = `<!doctype html><html><head>${styleTagsHTML(registry)}</head><body>${body}</body></html>`
```

One registry per request. The client adopts the rendered style elements on hydration and inserts nothing twice.

### SEO

```tsx
import { Head } from '@rootnative/web/dom'

;<Head
  title="Page title"
  description="What the page is about"
  canonical="https://example.com/page"
  openGraph={{ title: 'Page title', image: 'https://example.com/og.png' }}
  jsonLd={{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Page title' }}
/>
```

React 19 moves `<title>`, `<meta>`, and `<link>` into `<head>` on the server and on the client.

## Setup

Until the package is on npm, link the workspace package or use a path alias.

**Vite**

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: { 'react-native': '@rootnative/web' },
  },
})
```

**TypeScript**

```json
{
  "compilerOptions": {
    "paths": { "react-native": ["./node_modules/@rootnative/web"] }
  }
}
```

A Vite plugin that sets the alias, resolves `.web.tsx` files, and inlines `Platform.OS` is planned. The library works without it.

## Supported APIs

**Components:** `View`, `Text`, `Image`, `Pressable`, `ScrollView`, `TextInput`, `StatusBar`

**APIs:** `StyleSheet`, `Platform`, `Dimensions`, `useWindowDimensions`, `Appearance`, `useColorScheme`, `AccessibilityInfo`, `I18nManager`, `BackHandler`, `PixelRatio`, `processColor`, `usePressability`

**Web layer:** `Head`

**Server:** `createStyleRegistry`, `StyleRegistryProvider`, `renderStyleTags`, `styleTagsHTML`

Notes on the web behavior of shipped props:

| Prop                                                                          | Behavior                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `role`                                                                        | Picks the element. Roles with no implicit element, and the table roles, keep a `role` attribute.                                                                                                                                                                                                                       |
| `aria-level`                                                                  | Web only. The heading level, 1 to 6. Default 2.                                                                                                                                                                                                                                                                        |
| `href`, `target`, `rel`, `download`                                           | Web only. Render an anchor.                                                                                                                                                                                                                                                                                            |
| `on*` DOM handlers                                                            | Pass through to the element. `onClick`, `onKeyDown`, `onPointerDown`, and the rest.                                                                                                                                                                                                                                    |
| `onLayout`                                                                    | A `ResizeObserver`. Fires after mount and after each size change.                                                                                                                                                                                                                                                      |
| `pointerEvents`                                                               | `none`, `auto`, `box-none`, and `box-only`.                                                                                                                                                                                                                                                                            |
| `numberOfLines`                                                               | 1 truncates with an ellipsis. More lines clamp.                                                                                                                                                                                                                                                                        |
| `ellipsizeMode`                                                               | `tail` and `clip`. `head` and `middle` fall back to `tail` for now.                                                                                                                                                                                                                                                    |
| `selectable`                                                                  | On by default on the web. `false` sets `user-select: none`.                                                                                                                                                                                                                                                            |
| `Text` `onPress`                                                              | A click. `Text` has no `onPressIn`, `onPressOut`, or `onLongPress` yet.                                                                                                                                                                                                                                                |
| `Platform.isDisableAnimations`                                                | Follows `prefers-reduced-motion`.                                                                                                                                                                                                                                                                                      |
| `Dimensions.get('window').fontScale`                                          | The root font size divided by 16, the browser's font-size preference.                                                                                                                                                                                                                                                  |
| `Appearance.getColorScheme()`                                                 | `prefers-color-scheme`. `light` on the server and during hydration, then the real scheme.                                                                                                                                                                                                                              |
| `Appearance.setColorScheme()`                                                 | Also sets `color-scheme` on `<html>`, so form controls and scrollbars follow the override. `null` or `unspecified` returns to the preference.                                                                                                                                                                          |
| `usePressability`                                                             | Returns pointer, keyboard, and focus handlers, not responder handlers. Spread them on a `View`.                                                                                                                                                                                                                        |
| `usePressability` `onPress`                                                   | Gets the `pointerup` event. A keyboard or assistive-technology activation gets the `click` event. `preventDefault()` cancels the click, so a link does not navigate.                                                                                                                                                   |
| Press events                                                                  | `nativeEvent` is the DOM event, with `locationX`, `locationY`, `pageX`, `pageY`, `timestamp`, `touches`, and `changedTouches` added.                                                                                                                                                                                   |
| `Pressable` state                                                             | `pressed`, and web-only `hovered` and `focused`. `focused` is true for keyboard focus only (`:focus-visible`).                                                                                                                                                                                                         |
| `Pressable` `hitSlop`                                                         | An invisible `::before` box grows the hit area. A parent with `overflow: hidden` clips it.                                                                                                                                                                                                                             |
| `Pressable` `cancelable={false}`                                              | Sets `touch-action: none`, so a scroll that starts on the element cannot cancel the press.                                                                                                                                                                                                                             |
| `Pressable` `disabled`                                                        | Sets `aria-disabled` and takes the element out of the tab order.                                                                                                                                                                                                                                                       |
| `role="button"`                                                               | Renders `<button type="button">`, so it never submits a form.                                                                                                                                                                                                                                                          |
| `Image`                                                                       | A box with an `<img>` inside. The style sizes the box; `resizeMode` is `object-fit`. No style and no source size means 0 × 0, as on native.                                                                                                                                                                            |
| `Image` `source`                                                              | An array with `scale` is a `srcset` with `x` descriptors; with `width`, `w` descriptors and `sizes` from the style width. A string is a bundler asset URL. A number (Metro asset id) warns and loads nothing.                                                                                                          |
| `Image` `source.headers`                                                      | A `fetch` with the headers, method, and body. The `<img>` loads the result as an object URL.                                                                                                                                                                                                                           |
| `Image` `resizeMode="repeat"`                                                 | A repeating `background-image` on a div. The `<img>` stays in the tree to load and report events.                                                                                                                                                                                                                      |
| `Image` `tintColor`                                                           | The color painted through a CSS `mask-image` of the source. The box takes `role="img"` and the label.                                                                                                                                                                                                                  |
| `Image` `onProgress`                                                          | Not fired. The browser gives no progress for `<img>`.                                                                                                                                                                                                                                                                  |
| `Image` `loading`, `fetchPriority`, `decoding`                                | Web only. Pass to the `<img>`.                                                                                                                                                                                                                                                                                         |
| `Image.queryCache()`                                                          | Resolves `{}`. The browser does not expose its cache.                                                                                                                                                                                                                                                                  |
| `ScrollView`                                                                  | An overflow box on one axis, with the content in a `View`. `scrollEnabled={false}` hides the overflow.                                                                                                                                                                                                                 |
| `ScrollView` scroll events                                                    | `nativeEvent` is the DOM event with `contentOffset`, `contentSize`, `layoutMeasurement`, `contentInset` (zeros), and `zoomScale` (1) added. No `velocity`.                                                                                                                                                             |
| `ScrollView` drag and momentum                                                | A scroll while a pointer is down is a drag: `onScrollBeginDrag`, then `onScrollEndDrag` on release. Any other scroll (wheel, keyboard, `scrollTo`) and a scroll after a release is momentum. `onMomentumScrollEnd` comes from `scrollend`, or 150 ms after the last scroll event where the browser has no `scrollend`. |
| `ScrollView` `snapToInterval`, `snapToOffsets`, `pagingEnabled`               | Snap after the scroll settles, with a smooth scroll (instant under `prefers-reduced-motion`). `snapToStart` and `snapToEnd` apply to `snapToOffsets`.                                                                                                                                                                  |
| `ScrollView` `showsVerticalScrollIndicator`, `showsHorizontalScrollIndicator` | `false` on the scroll axis hides the scrollbar.                                                                                                                                                                                                                                                                        |
| `ScrollView` `stickyHeaderIndices`                                            | `position: sticky` wrappers. `stickyHeaderHiddenOnScroll` slides the header out on a scroll down. Vertical only, as on native.                                                                                                                                                                                         |
| `ScrollView` `keyboardDismissMode="on-drag"`                                  | Blurs the focused element when a drag starts.                                                                                                                                                                                                                                                                          |
| `ScrollView` `scrollTo()`                                                     | `{ x, y, animated }` as on native. The DOM forms `scrollTo(x, y)` and `scrollTo({ left, top })` still work. The deprecated positional `scrollTo(y, x)` of React Native does not.                                                                                                                                       |
| `ScrollView` ref                                                              | The scroll element, with `scrollTo`, `scrollToEnd`, `getScrollableNode`, `getInnerViewNode`, `getNativeScrollRef`, `getScrollResponder`, and a no-op `flashScrollIndicators`.                                                                                                                                          |
| `ScrollView` `refreshControl`                                                 | Wraps the scroller, so the control can own the pull gesture.                                                                                                                                                                                                                                                           |
| `ScrollView` native-only props                                                | `bounces`, `contentInset`, `decelerationRate`, `maintainVisibleContentPosition`, `overScrollMode`, zoom, and the other iOS and Android props are accepted and ignored. `scrollEventThrottle` is not needed: the browser already sends one event per frame.                                                             |
| `TextInput`                                                                   | An `<input type="text">`, or a `<textarea>` with `multiline`. No border, no padding, no background, as on iOS. `dir="auto"` follows the text.                                                                                                                                                                          |
| `TextInput` `multiline`                                                       | Grows with the text through `field-sizing: content`, with a `scrollHeight` fallback for older browsers. `numberOfLines` is the minimum number of rows. A `height` in the style fixes the size.                                                                                                                         |
| `TextInput` Enter                                                             | Single-line: `onSubmitEditing`, then blur (`blurOnSubmit`, `submitBehavior`). The browser's default stays, so a field inside a `<form>` submits the form. Multiline: a newline, unless `submitBehavior` is `submit` or `blurAndSubmit`; Shift+Enter is always a newline.                                               |
| `TextInput` `keyboardType`, `returnKeyType`                                   | `inputmode` and `enterkeyhint`. `inputMode` and `enterKeyHint` win when set. `showSoftInputOnFocus={false}` is `inputmode="none"`.                                                                                                                                                                                     |
| `TextInput` `autoComplete`, `textContentType`                                 | The HTML `autocomplete` tokens. React Native-only values map (`name-given` → `given-name`, `sms-otp` → `one-time-code`, …). `textContentType` maps when `autoComplete` is not set.                                                                                                                                     |
| `TextInput` `editable={false}`                                                | `readonly`, not `disabled`, so the field stays focusable and its text selectable.                                                                                                                                                                                                                                      |
| `TextInput` `placeholderTextColor`, `selectionColor`, `cursorColor`           | `::placeholder` color, `::selection` background plus `caret-color`, and `caret-color`. `caretHidden` makes the caret transparent.                                                                                                                                                                                      |
| `TextInput` events                                                            | `nativeEvent` is the DOM event with `text`, `eventCount`, `key`, `selection`, or `contentSize` added. `nativeEvent.target` is the element, not a node handle. `onEndEditing` fires on blur.                                                                                                                            |
| `TextInput` ref                                                               | The element, with `clear()`, `isFocused()`, `getNativeRef()`, and `setNativeProps({ text })`. `TextInput.State` has `currentlyFocusedInput`, `focusTextInput`, `blurTextInput`.                                                                                                                                        |
| `TextInput` native-only props                                                 | `clearButtonMode`, `keyboardAppearance`, `textAlignVertical`, `underlineColorAndroid`, `passwordRules`, and the other iOS and Android props are accepted and ignored.                                                                                                                                                  |
| `I18nManager.isRTL`                                                           | The document direction (`dir` or CSS `direction` on `<html>`), read live. `forceRTL()` sets `dir` on `<html>` at once, not after a restart. `localeIdentifier` is `navigator.language`.                                                                                                                                |
| `AccessibilityInfo`                                                           | Reduce motion, reduce transparency, inverted colors, and contrast come from media queries, live and with change events. Screen reader, bold text, and grayscale are unknown to a browser and report `false`; their events never fire.                                                                                  |
| `AccessibilityInfo.announceForAccessibility()`                                | Writes to one hidden `aria-live` region (`polite`, or `assertive` with `queue: false`). `announcementFinished` fires on the next frame.                                                                                                                                                                                |
| `BackHandler`                                                                 | Handlers register and remove, but never fire: the browser has no hardware back button, and the history belongs to the router. `exitApp()` does nothing.                                                                                                                                                                |
| `PixelRatio`                                                                  | `get()` is `devicePixelRatio`; `getFontScale()` is the root font size over 16.                                                                                                                                                                                                                                         |
| `processColor()`                                                              | An unsigned 32-bit ARGB integer, as on iOS.                                                                                                                                                                                                                                                                            |
| `StatusBar`                                                                   | `backgroundColor` writes the `theme-color` meta, which mobile browsers paint around the page. The last mounted `StatusBar` wins, and unmount restores. `barStyle`, `hidden`, `translucent` have no web effect. `currentHeight` is `null`.                                                                              |
| `PanResponder`                                                                | `panHandlers` are pointer handlers (`onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`, and the two capture variants). Spread them on a `View`. The element takes pointer capture on grant, so the gesture continues outside it.                                                                       |
| `PanResponder` negotiation                                                    | One responder at a time, as on native: capture callbacks run parent-first, bubble callbacks child-first, and a should-set while another responder holds the gesture asks its `onPanResponderTerminationRequest`. `onShouldBlockNativeResponder` is ignored.                                                            |
| `PanResponder` and touch scrolling                                            | Put `touchAction: 'none'` (or `pan-y`, `pan-x`) in the style of the element, or the browser scrolls instead of your gesture. The responder cannot set it for you.                                                                                                                                                      |
| `PanResponder` gesture state                                                  | `dx`, `dy`, `vx`, `vy` are in CSS pixels and pixels per millisecond, from the centroid of the active pointers. `x0`, `y0`, `moveX`, `moveY` are page coordinates. `getInteractionHandle()` is `null`.                                                                                                                  |

## Not supported

- The `react-native-web` internals and file layout.
- Expo and Metro. A Metro plugin is out of scope for 1.0.
- React 18, CommonJS, Flow.
- Props that React Native does not have, except the small web-only set above.

## Browser support

Chrome 95, Edge 95, Firefox 93, Safari 15.1, iOS Safari 15.1.

## Development

```sh
pnpm install
pnpm --filter @rootnative/playground dev   # one route per component
pnpm test                                  # Vitest in a real Chromium
pnpm lint
pnpm typecheck
pnpm build
```

The monorepo uses pnpm, TypeScript 7, tsdown, Vitest 5 in browser mode with Playwright, oxlint, and Prettier.

```
packages/
  web/          @rootnative/web
  playground/   Vite app with one route per component
```

Each component lives in one folder with its types and its tests.

## License

[MIT](./LICENSE)

# Changelog

All notable changes to `@rootnative/web` are in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Before `1.0.0`, any release can have breaking changes. Each release lists them.

## [Unreleased]

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

[unreleased]: https://github.com/rootnative/web/compare/web@0.0.0-alpha.0...HEAD
[0.0.0-alpha.0]: https://github.com/rootnative/web/releases/tag/web@0.0.0-alpha.0

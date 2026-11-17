# Changelog

All notable changes to `@rootnative/web-expo` are in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Before `1.0.0`, any release can have breaking changes. Each release lists them.

Each version works only with the same version of `@rootnative/web`. The package depends on that exact version.

## [Unreleased]

### Added

- **Expo Router runs**, with `web.output: 'single'` and `'static'`: tabs, a stack, links, the back button, and a URL that opens a screen directly. With `'static'`, each route renders on the server through `AppRegistry.getApplication`, with the three style sheets of `@rootnative/web`, and the page hydrates.
- **`AssetRegistry`**, as react-native-web has it: the asset registry of `@rootnative/web` as one object. The Babel preset of Expo sends `import { AssetRegistry } from 'react-native'` to it, and `expo-asset` imports it in a server render. Before, the server bundle of Expo Router failed on the missing file.
- **`DeviceEventEmitter` and `NativeEventEmitter`**, as react-native-web has them. Each `NativeEventEmitter` puts its listeners on the shared `DeviceEventEmitter`, and only JavaScript emits events. `@expo/log-box`, the error overlay of Expo Router, makes a `NativeEventEmitter` when it loads, and the stub threw an error there.
- **`UIManager`, `NativeModules`, and `LogBox`**, as react-native-web has them. `expo-constants` reads `NativeModules` when it loads, and the stub threw an error there. `NativeModules` has no native module, `LogBox` does nothing, and `UIManager` measures and updates an element with the host methods of `@rootnative/web`.

### Changed

- **`Animated` and `Easing` load from `@rootnative/web`.** Before, each was a stub that threw an error on use.

## [0.0.0-alpha.5] - 2026-11-15

### Changed

- **Uses `@rootnative/web` `0.0.0-alpha.5`,** which makes each render after the first one cheaper. This package has no change of its own. See the [changelog of `@rootnative/web`](https://github.com/rootnative/web/blob/main/packages/web/CHANGELOG.md).

## [0.0.0-alpha.4] - 2026-11-15

### Added

- **The first release.** An Expo app with no router runs on `@rootnative/web` in place of react-native-web. Install this package under the name `react-native-web`, with an npm alias. Expo Router needs `Animated`, which isn't there yet. See [Expo](https://rootnative.github.io/web/expo).
- **The file layout that Expo's web bundler reads:** one file for each name of `react-native` in `dist/exports/<Name>/index.js`, and `dist/index.js` for every name. Each file loads only its own module of `@rootnative/web`, so the app bundles only the components that it imports.
- **`AppRegistry`** with the three methods that Expo calls: `registerComponent`, `runApplication`, which renders or hydrates the app, and `getApplication`, which gives a server render its element and its style element.
- **`createSheet`** in `dist/exports/StyleSheet/dom`, where Expo looks for it. It adds the four reset rules of react-native-web, such as `body { margin: 0 }`, once for each document.
- **`asset-registry.js`**, for a library that imports React Native's asset registry, such as `react-native-svg` or `expo-asset`.
- **The two style files of react-native-web that Reanimated 4 reads**, so Reanimated animates the components of `@rootnative/web`.
- **A stub for each name that `@rootnative/web` doesn't have yet**, such as `Animated`. The import works, and a use throws an error with the name. `expo-exports.json` lists these names under `missing`.

[unreleased]: https://github.com/rootnative/web/compare/web@0.0.0-alpha.5...HEAD
[0.0.0-alpha.5]: https://github.com/rootnative/web/releases/tag/web@0.0.0-alpha.5
[0.0.0-alpha.4]: https://github.com/rootnative/web/releases/tag/web@0.0.0-alpha.4

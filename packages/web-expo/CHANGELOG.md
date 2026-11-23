# Changelog

All notable changes to `@rootnative/web-expo` are in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow modified semver: a breaking change bumps the middle digit (`0.1.0`), and fixes and additions bump the last digit (`0.0.2`).

Each version works only with the same version of `@rootnative/web`. The package depends on that exact version.

## [Unreleased]

### Added

- **`withRootNative`, a Metro helper in `metro.cjs`.** An Expo app installs this package under its own name, and wraps its Metro config with `withRootNative`. The `react-native-web` alias isn't needed anymore, and it still works. On the web, the helper sends each import of `react-native` and of react-native-web to this package. On iOS and Android, it changes nothing. Keep `react-dom` in the `dependencies` of the app: without it and without react-native-web, Expo stops with an error. See [Expo](https://rootnative.github.io/web/expo).

## [0.0.2] - 2026-11-22

### Changed

- **Depends on `@rootnative/web` `0.0.2`.** An Expo Router `<Link target="_blank">` now opens a new tab, and `dataSet`, `inert`, and `suppressHydrationWarning` reach the element. The [changelog of `@rootnative/web`](https://github.com/rootnative/web/blob/main/packages/web/CHANGELOG.md) has the details.

## [0.0.1] - 2026-11-21

The first stable release. An Expo app, also with Expo Router, runs on `@rootnative/web` `0.0.1` in place of react-native-web. See [Expo](https://rootnative.github.io/web/expo).

### Added

- **The file layout that Expo's web bundler reads:** one file for each name of `react-native` in `dist/exports/<Name>/index.js`. Each file loads only its own module of `@rootnative/web`.
- **`AppRegistry`**, for Expo Router with `web.output: 'single'` and `'static'`. With `'static'`, each route renders on the server, and the page hydrates.
- **The names that Expo and its libraries read from react-native-web:** `AssetRegistry`, `DeviceEventEmitter`, `NativeEventEmitter`, `UIManager`, `NativeModules`, and `LogBox`, the asset registry for `react-native-svg` and `expo-asset`, and the two style files that Reanimated 4 reads.
- **`createSheet`**, with the four reset rules of react-native-web, such as `body { margin: 0 }`.
- **A stub for each name that `@rootnative/web` doesn't have**, such as `Picker`. The import works, and a use throws an error with the name. `expo-exports.json` lists these names under `missing`.

[unreleased]: https://github.com/rootnative/web/compare/web@0.0.2...HEAD
[0.0.2]: https://github.com/rootnative/web/releases/tag/web@0.0.2
[0.0.1]: https://github.com/rootnative/web/releases/tag/web@0.0.1

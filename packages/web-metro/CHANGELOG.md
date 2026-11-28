# Changelog

All notable changes to `@rootnative/web-metro` are in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow modified semver: a breaking change bumps the middle digit (`0.1.0`), and fixes and additions bump the last digit (`0.0.2`).

Each version works only with the same version of `@rootnative/web`. The package depends on that exact version.

## [Unreleased]

### Added

- **Runs a React Native app with no Expo on `@rootnative/web`, with Metro.** `withRootNative` in `metro.config.js` adds the web platform. On the web, it sends `react-native` to `@rootnative/web`, and it loads the browser build of each library, with no `.native` file. On iOS and Android, it changes nothing. See [React Native CLI](https://rootnative.github.io/web/react-native-cli).
- **A page on the dev server.** `react-native start` serves the app at `/index.html`. An `index.html` in the app folder takes the place of that page.
- **Fast Refresh on the web.** An edit updates the page and keeps the state of each component.
- **`rootnative-web build`.** Writes the production build to `dist/`: the page, the bundle with a hash in its name, and the images.
- **Small bundles of `@rootnative/web`.** Each named import of `react-native` loads only its own module of `@rootnative/web`, as in an Expo app.
- **A stub for each name that `@rootnative/web` doesn't have**, such as `Picker`. The import works, and a use throws an error with the name. `facade-exports.json` lists these names under `missing`.

[unreleased]: https://github.com/rootnative/web/compare/web@0.0.9...HEAD

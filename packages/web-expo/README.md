# @rootnative/web-expo

Runs an Expo app on [`@rootnative/web`](https://rootnative.github.io/web/) in place of react-native-web.

Expo's web bundler rewrites each `react-native` import to a file of react-native-web. This package has the same file layout, and each file loads `@rootnative/web`.

## Install

Install this package, and remove react-native-web:

```sh
npm install @rootnative/web-expo
npm uninstall react-native-web
```

Wrap your Metro config with `withRootNative`. On the web, it sends each import of `react-native` and of react-native-web to this package:

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config')
const { withRootNative } = require('@rootnative/web-expo/metro.cjs')

module.exports = withRootNative(getDefaultConfig(__dirname))
```

Keep `react-dom` in the `dependencies` of your `package.json`. Expo then warns that react-native-web isn't installed, but the warning doesn't stop the dev server or `expo export`. Without `react-dom` there, Expo stops with an error.

Or, with no Metro config, install this package under the name `react-native-web`:

```json
{
  "dependencies": {
    "react-native-web": "npm:@rootnative/web-expo@0.0.7"
  }
}
```

This package depends on the same version of `@rootnative/web`, and works only with that version. Don't add a different version of `@rootnative/web` to your app.

## What works

An Expo app, also with Expo Router, on the dev server and in a web export (`expo export --platform web`) with `web.output: 'single'` or `'static'`. Reanimated 4 animates the components, image imports load, and `react-native-svg` renders.

The names of React Native that `@rootnative/web` doesn't have yet load as stubs, and a stub throws when your code uses it. `expo-exports.json` lists them under `missing`.

Some web-only code that you wrote for react-native-web isn't necessary now. See [From react-native-web](https://rootnative.github.io/web/from-react-native-web).

## Tests

The `jest-expo/web` preset maps `react-native` to react-native-web. Map it to this package, so your web tests run on the runtime that your app ships. Also let Babel transform `@rootnative`, because its packages are ES modules:

```js
// jest.config.js
module.exports = {
  preset: 'jest-expo/web',
  moduleNameMapper: {
    '^react-native$': '@rootnative/web-expo',
    '^react-native-web$': '@rootnative/web-expo',
    '^react-native-web/(.*)$': '@rootnative/web-expo/$1',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|@rootnative))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
}
```

jsdom has no layout, so `onLayout` doesn't fire, and a scroll does nothing. See [Tests](https://rootnative.github.io/web/expo#tests).

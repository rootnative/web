# @rootnative/web-expo

Runs an Expo app on [`@rootnative/web`](https://rootnative.github.io/web/) in place of react-native-web.

Expo's web bundler rewrites each `react-native` import to a file of react-native-web. This package has the same file layout, and each file loads `@rootnative/web`. Install it under the name `react-native-web`:

```json
{
  "dependencies": {
    "react-native-web": "npm:@rootnative/web-expo@0.0.0-alpha.6"
  }
}
```

This package depends on the same version of `@rootnative/web`, and works only with that version. Don't add a different version of `@rootnative/web` to your app.

## What works

An Expo app, also with Expo Router, on the dev server and in a web export (`expo export --platform web`) with `web.output: 'single'` or `'static'`. Reanimated 4 animates the components, image imports load, and `react-native-svg` renders.

The names of React Native that `@rootnative/web` doesn't have yet load as stubs, and a stub throws when your code uses it. `expo-exports.json` lists them under `missing`.

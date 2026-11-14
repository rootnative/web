# @rootnative/web-expo

Runs an Expo app on [`@rootnative/web`](https://rootnative.github.io/web/) in place of react-native-web.

Expo's web bundler rewrites each `react-native` import to a file of react-native-web. This package has the same file layout, and each file loads `@rootnative/web`. Install it under the name `react-native-web`:

```json
{
  "dependencies": {
    "react-native-web": "npm:@rootnative/web-expo@0.0.0-alpha.3"
  }
}
```

It isn't on npm yet.

## What works

An Expo app with no router, on the dev server. The names of React Native that `@rootnative/web` doesn't have load as stubs, and a stub throws when your code uses it. `expo-exports.json` lists them under `missing`. Expo Router needs `Animated`, which is one of them.

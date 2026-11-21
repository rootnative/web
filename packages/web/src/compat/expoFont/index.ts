// The Vite plugin resolves `expo-font` to this file. Expo's modules import `NativeModules` from
// `react-native`, which this package doesn't have, so the real `expo-font` stops the build. The
// error makes this file act as a missing module: a library that loads `expo-font` in a `try`
// block, as the icon sets of `@react-native-vector-icons` do, goes on without it.
export {}

throw new Error(
  "expo-font doesn't run on @rootnative/web without Expo. The Vite plugin resolves it to this module. See https://rootnative.github.io/web/vite-plugin#expo-modules",
)

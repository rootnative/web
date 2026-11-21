// A library that loads `expo-font` in a `try` block, as the icon sets of
// `@react-native-vector-icons` do. The bundler still follows the `require`, so the build reads
// the installed `expo-font`. JavaScript, as the build of a library is.
let expoFont = null
try {
  expoFont = require('expo-font')
} catch {
  expoFont = null
}

export const fontLoader = expoFont === null ? 'Fonts without Expo' : 'Fonts with Expo'

export { ICON_FONT_WARNING, ICON_SET_FILE, patchIconSet } from './iconFonts'
export { inlinePlatformOS } from './inlinePlatformOS'
export {
  createWorkletTransform,
  WORKLET_CODE,
  type WorkletTransform,
  type WorkletTransformResult,
} from './worklets'

/** Module names that resolve to this package. Each one matches the exact name only. */
export const ALIASES: Readonly<Record<string, string>> = {
  'react-native': '@rootnative/web',
  // Libraries import it on the web, and the real module is Flow source that no web bundler reads.
  '@react-native/assets-registry/registry': '@rootnative/web/assets-registry',
  // Reanimated 4 reads its web style helpers from these react-native-web internal files.
  'react-native-web/dist/cjs/exports/StyleSheet/compiler/createReactDOMStyle.js':
    '@rootnative/web/style',
  'react-native-web/dist/cjs/exports/StyleSheet/preprocess.js': '@rootnative/web/style',
  // Expo's modules don't run here. A library that loads `expo-font` only under Expo gets a
  // module that throws, as a missing module does, so a project with Expo installed still builds.
  'expo-font': '@rootnative/web/internal/compat/expoFont/index.js',
}

/**
 * The globals that React Native code expects from its bundler, each as the code that replaces
 * the name. `__DEV__` is `true` in a development build and `false` in a production build.
 * `global` is React Native's name for the global object, which a browser doesn't have.
 */
export const globalDefines = (production: boolean): Record<string, string> => ({
  __DEV__: JSON.stringify(!production),
  global: 'globalThis',
})

/**
 * Puts a `.web` variant of each extension first, as Metro does for the web platform. An
 * import of `./Button` then finds `Button.web.tsx` before `Button.tsx`.
 */
export const webExtensions = (extensions: readonly string[]): string[] => {
  const web = extensions.map((extension) =>
    extension.startsWith('.web.') ? extension : `.web${extension}`,
  )
  return [...new Set([...web, ...extensions])]
}

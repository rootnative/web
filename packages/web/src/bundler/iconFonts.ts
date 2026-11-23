// An icon set of `@react-native-vector-icons` loads its font only through Expo's font module.
// With no Expo, each icon is an empty box. A bundler turns the `require` of the font file into
// the URL of the file, so `createIconSet` already has that URL in `fontSource`: as a string, or,
// from Vite's dependency optimizer, as the `default` of a module object. The patch adds a
// `FontFace` of that URL, with the family that the style of each icon asks for, in the one file
// that each icon set of the family calls.

/** The file of `createIconSet` in `@react-native-vector-icons/common`. */
export const ICON_SET_FILE: RegExp =
  /[\\/]@react-native-vector-icons[\\/]common[\\/]lib[\\/]module[\\/]create-icon-set\.js(?:$|\?)/

// The line after which `fontReference` and `fontSource` both have their values.
const FONT_SOURCE_LINE = /\n([ \t]*)const fontSource = [^;\n]*\.fontSource;[ \t]*\n/

const fontFaceCode = (indent: string): string =>
  [
    `const fontUrl = typeof fontSource === 'string' ? fontSource : typeof fontSource?.default === 'string' ? fontSource.default : typeof fontSource?.uri === 'string' ? fontSource.uri : undefined;`,
    `if (fontUrl !== undefined && typeof document !== 'undefined' && typeof FontFace === 'function' && ![...document.fonts].some((face) => face.family.replace(/^["']|["']$/g, '') === fontReference)) {`,
    `  const face = new FontFace(fontReference, 'url(' + JSON.stringify(fontUrl) + ')');`,
    `  document.fonts.add(face);`,
    `  face.load().catch((error) => console.warn('[@rootnative/web] The icon font ' + fontReference + ' did not load.', error));`,
    `}`,
  ]
    .map((line) => indent + line)
    .join('\n')

/** The message when the file doesn't have the line that the patch needs. */
export const ICON_FONT_WARNING =
  "@rootnative/web: this version of @react-native-vector-icons/common has new code, so the plugin can't load the fonts of its icon sets. Add each font in your app: https://rootnative.github.io/web/libraries#icon-fonts"

/**
 * The code of `create-icon-set.js` with the `FontFace` step, or `null` when the file doesn't have
 * the line that the step goes after.
 */
export const patchIconSet = (code: string): string | null => {
  const match = FONT_SOURCE_LINE.exec(code)
  if (match === null || !code.includes('fontReference')) return null
  const end = match.index + match[0].length
  return `${code.slice(0, end)}${fontFaceCode(match[1] ?? '')}\n${code.slice(end)}`
}

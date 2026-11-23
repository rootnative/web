import { processColor } from '@rootnative/web/internal/apis/processColor/index.js'

// `expo-system-ui` reads the background color of `body` with this function of react-native-web.
// The same rules: a CSS-wide keyword or a `var()` stays as it is, and each other color becomes an
// `rgba()` string, with its alpha multiplied by `opacity`.
const isWebColor = (color) =>
  color === 'currentcolor' ||
  color === 'currentColor' ||
  color === 'inherit' ||
  color.startsWith('var(')

export function normalizeColor(color, opacity = 1) {
  if (color === undefined || color === null) return undefined
  if (typeof color === 'string' && isWebColor(color)) return color
  const argb = processColor(color)
  if (argb === undefined || argb === null) return undefined
  const red = (argb >> 16) & 255
  const green = (argb >> 8) & 255
  const blue = argb & 255
  const alpha = ((argb >> 24) & 255) / 255
  return `rgba(${red},${green},${blue},${(alpha * opacity).toFixed(2)})`
}

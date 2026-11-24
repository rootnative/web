import type { RectOrSize } from '../events/press/types'
import type { StyleRegistry } from '../style/registry'
import { systemFontStack } from '../style/resolveStyle'

// The browser hit-tests a pseudo-element as part of its element, so an invisible ::before
// box around the element grows its hit area. z-index -1 keeps it under the children, so it
// never takes a press from them. Its empty content is a line of text, so the browser needs its
// font: the one of a default Text, which a page loads anyway. Else a <button> gives it Arial, and
// the first layout loads a font that no text uses (about 2 ms in Chromium).
export const hitSlopClass = (
  registry: StyleRegistry,
  hitSlop: RectOrSize | undefined,
): string | undefined => {
  if (hitSlop === undefined) return undefined
  const rect =
    typeof hitSlop === 'number'
      ? { top: hitSlop, right: hitSlop, bottom: hitSlop, left: hitSlop }
      : hitSlop
  const { top = 0, right = 0, bottom = 0, left = 0 } = rect
  if (top === 0 && right === 0 && bottom === 0 && left === 0) return undefined

  const name = `rn-hs-${[top, right, bottom, left].map((n) => String(n).replace(/[^0-9]/g, '_')).join('-')}`
  return registry.staticClass(name, [
    `.${name}::before{content:"";position:absolute;` +
      `top:${-top}px;right:${-right}px;bottom:${-bottom}px;left:${-left}px;z-index:-1;` +
      `font:14px ${systemFontStack}}`,
  ])
}

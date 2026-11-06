import { toCSSColor } from './color'
import { legacyBoxShadow, toCSSBoxShadow, toCSSFilter, toCSSTextShadow } from './shadow'
import { toCSSTransform, toCSSTransformOrigin } from './transform'
import type { CSSDeclarations, FlatStyle } from './types'
import { toUnit, unitlessProperties } from './units'

const colorProperties = new Set([
  'backgroundColor',
  'borderBlockColor',
  'borderBlockEndColor',
  'borderBlockStartColor',
  'borderBottomColor',
  'borderColor',
  'borderEndColor',
  'borderLeftColor',
  'borderRightColor',
  'borderStartColor',
  'borderTopColor',
  'color',
  'outlineColor',
  'textDecorationColor',
])

// React Native names that differ from the CSS name with the same meaning.
const renamedProperties: Record<string, string> = {
  borderEndColor: 'borderInlineEndColor',
  borderEndWidth: 'borderInlineEndWidth',
  borderStartColor: 'borderInlineStartColor',
  borderStartWidth: 'borderInlineStartWidth',
  borderTopStartRadius: 'borderStartStartRadius',
  borderTopEndRadius: 'borderStartEndRadius',
  borderBottomStartRadius: 'borderEndStartRadius',
  borderBottomEndRadius: 'borderEndEndRadius',
  end: 'insetInlineEnd',
  marginEnd: 'marginInlineEnd',
  marginStart: 'marginInlineStart',
  paddingEnd: 'paddingInlineEnd',
  paddingStart: 'paddingInlineStart',
  start: 'insetInlineStart',
  writingDirection: 'direction',
}

// React Native shorthands that have no single CSS property.
const expandedProperties: Record<string, readonly string[]> = {
  marginHorizontal: ['marginLeft', 'marginRight'],
  marginVertical: ['marginTop', 'marginBottom'],
  paddingHorizontal: ['paddingLeft', 'paddingRight'],
  paddingVertical: ['paddingTop', 'paddingBottom'],
}

// Native-only properties, or properties that another step handles.
const ignoredProperties = new Set([
  'borderCurve',
  'elevation',
  'includeFontPadding',
  'overlayColor',
  'shadowColor',
  'shadowOffset',
  'shadowOpacity',
  'shadowRadius',
  'textShadowColor',
  'textShadowOffset',
  'textShadowRadius',
  'tintColor',
])

const fontWeightNames: Record<string, string> = {
  ultralight: '200',
  thin: '100',
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  condensedBold: '700',
  condensed: '400',
  heavy: '800',
  black: '900',
}

const resizeModeToObjectFit: Record<string, string> = {
  contain: 'contain',
  cover: 'cover',
  stretch: 'fill',
  center: 'none',
  repeat: 'none',
}

// The font React Native calls "System".
const systemFontStack =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

const textAlignVerticalToVerticalAlign: Record<string, string> = {
  top: 'top',
  center: 'middle',
  bottom: 'bottom',
}

export const resolveStyle = (style: FlatStyle): CSSDeclarations => {
  const out: CSSDeclarations = {}

  for (const [name, value] of Object.entries(style)) {
    if (value === undefined || value === null || ignoredProperties.has(name)) continue
    resolveProperty(name, value, out)
  }

  if (out['boxShadow'] === undefined && hasLegacyShadow(style)) {
    const shadow = legacyBoxShadow(style)
    if (shadow !== undefined) out['boxShadow'] = shadow
  }
  if (style['textShadowColor'] !== undefined || style['textShadowOffset'] !== undefined) {
    const shadow = toCSSTextShadow(style)
    if (shadow !== undefined) out['textShadow'] = shadow
  }

  return out
}

const resolveProperty = (name: string, value: unknown, out: CSSDeclarations): void => {
  switch (name) {
    case 'flex':
      if (typeof value === 'number') {
        out['flex'] = value > 0 ? `${value} 1 0%` : value === 0 ? '0 0 auto' : '0 1 auto'
      } else {
        out['flex'] = String(value)
      }
      return
    case 'transform': {
      const transform = toCSSTransform(value)
      if (transform !== undefined) out['transform'] = transform
      return
    }
    case 'transformOrigin': {
      const origin = toCSSTransformOrigin(value)
      if (origin !== undefined) out['transformOrigin'] = origin
      return
    }
    case 'boxShadow': {
      const shadow = toCSSBoxShadow(value)
      if (shadow !== undefined) out['boxShadow'] = shadow
      return
    }
    case 'filter': {
      const filter = toCSSFilter(value)
      if (filter !== undefined) out['filter'] = filter
      return
    }
    case 'fontWeight':
      out['fontWeight'] = fontWeightNames[String(value)] ?? String(value)
      return
    case 'fontFamily':
      out['fontFamily'] = value === 'System' ? systemFontStack : String(value)
      return
    case 'fontVariant':
      out['fontVariant'] = Array.isArray(value) ? value.join(' ') : String(value)
      return
    case 'fontVariationSettings':
      out['fontVariationSettings'] = Array.isArray(value)
        ? (value as ReadonlyArray<{ axis: string; value: number }>)
            .map((v) => `'${v.axis}' ${v.value}`)
            .join(', ')
        : String(value)
      return
    case 'resizeMode': {
      const fit = resizeModeToObjectFit[String(value)]
      if (fit !== undefined && out['objectFit'] === undefined) out['objectFit'] = fit
      return
    }
    case 'objectFit':
      out['objectFit'] = String(value)
      return
    case 'textAlignVertical': {
      const align = textAlignVerticalToVerticalAlign[String(value)]
      if (align !== undefined && out['verticalAlign'] === undefined) out['verticalAlign'] = align
      return
    }
    case 'backgroundImage':
      if (typeof value === 'string') out['backgroundImage'] = value
      return
  }

  if (colorProperties.has(name)) {
    const color = toCSSColor(value)
    if (color !== undefined) out[renamedProperties[name] ?? name] = color
    return
  }

  const targets = expandedProperties[name] ?? [renamedProperties[name] ?? name]
  const css = unitlessProperties.has(name) ? String(value) : toUnit(value, 'px')
  for (const target of targets) out[target] = css
}

const hasLegacyShadow = (style: FlatStyle): boolean =>
  style['shadowColor'] !== undefined ||
  style['shadowOffset'] !== undefined ||
  style['shadowOpacity'] !== undefined ||
  style['shadowRadius'] !== undefined

// The style types of React Native 0.88, so a style that type-checks on native type-checks here.
// `parity/typeParity.test-d.ts` compares them with the React Native types in both directions.
// The differences: `transform` takes no `Animated` node, `resizeMode` has no `'none'`, and
// `touchAction` is a web-only key.

import type { CSSProperties } from 'react'

export type ImageResizeMode = 'cover' | 'contain' | 'stretch' | 'repeat' | 'center'

/** A color from `PlatformColor` or `DynamicColorIOS` on native. The web has neither. */
export type NativeColorValue = symbol & { __NativeColorValue__: string }

/** @deprecated Use `NativeColorValue`. */
export type OpaqueColorValue = NativeColorValue

export type ColorValue = null | string | number | NativeColorValue

export type DimensionValue = number | string | 'auto' | null

export type CursorValue = 'auto' | 'pointer'

export type PointValue = { x: number; y: number }

export type EdgeInsetsValue = { top: number; left: number; right: number; bottom: number }

type LayoutStyle = Readonly<{
  display?: 'none' | 'flex' | 'contents' | undefined
  width?: DimensionValue | undefined
  height?: DimensionValue | undefined
  bottom?: DimensionValue | undefined
  end?: DimensionValue | undefined
  left?: DimensionValue | undefined
  right?: DimensionValue | undefined
  start?: DimensionValue | undefined
  top?: DimensionValue | undefined
  inset?: DimensionValue | undefined
  insetBlock?: DimensionValue | undefined
  insetBlockEnd?: DimensionValue | undefined
  insetBlockStart?: DimensionValue | undefined
  insetInline?: DimensionValue | undefined
  insetInlineEnd?: DimensionValue | undefined
  insetInlineStart?: DimensionValue | undefined
  minWidth?: DimensionValue | undefined
  maxWidth?: DimensionValue | undefined
  minHeight?: DimensionValue | undefined
  maxHeight?: DimensionValue | undefined
  margin?: DimensionValue | undefined
  marginBlock?: DimensionValue | undefined
  marginBlockEnd?: DimensionValue | undefined
  marginBlockStart?: DimensionValue | undefined
  marginBottom?: DimensionValue | undefined
  marginEnd?: DimensionValue | undefined
  marginHorizontal?: DimensionValue | undefined
  marginInline?: DimensionValue | undefined
  marginInlineEnd?: DimensionValue | undefined
  marginInlineStart?: DimensionValue | undefined
  marginLeft?: DimensionValue | undefined
  marginRight?: DimensionValue | undefined
  marginStart?: DimensionValue | undefined
  marginTop?: DimensionValue | undefined
  marginVertical?: DimensionValue | undefined
  padding?: DimensionValue | undefined
  paddingBlock?: DimensionValue | undefined
  paddingBlockEnd?: DimensionValue | undefined
  paddingBlockStart?: DimensionValue | undefined
  paddingBottom?: DimensionValue | undefined
  paddingEnd?: DimensionValue | undefined
  paddingHorizontal?: DimensionValue | undefined
  paddingInline?: DimensionValue | undefined
  paddingInlineEnd?: DimensionValue | undefined
  paddingInlineStart?: DimensionValue | undefined
  paddingLeft?: DimensionValue | undefined
  paddingRight?: DimensionValue | undefined
  paddingStart?: DimensionValue | undefined
  paddingTop?: DimensionValue | undefined
  paddingVertical?: DimensionValue | undefined
  borderWidth?: number | undefined
  borderBottomWidth?: number | undefined
  borderEndWidth?: number | undefined
  borderLeftWidth?: number | undefined
  borderRightWidth?: number | undefined
  borderStartWidth?: number | undefined
  borderTopWidth?: number | undefined
  position?: 'absolute' | 'relative' | 'static' | undefined
  flexDirection?: 'row' | 'row-reverse' | 'column' | 'column-reverse' | undefined
  flexWrap?: 'wrap' | 'nowrap' | 'wrap-reverse' | undefined
  justifyContent?:
    | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'space-between'
    | 'space-around'
    | 'space-evenly'
    | undefined
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline' | undefined
  alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline' | undefined
  alignContent?:
    | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'stretch'
    | 'space-between'
    | 'space-around'
    | 'space-evenly'
    | undefined
  overflow?: 'visible' | 'hidden' | 'scroll' | undefined
  flex?: number | undefined
  flexGrow?: number | undefined
  flexShrink?: number | undefined
  flexBasis?: number | string | undefined
  aspectRatio?: number | string | undefined
  boxSizing?: 'border-box' | 'content-box' | undefined
  zIndex?: number | undefined
  direction?: 'inherit' | 'ltr' | 'rtl' | undefined
  rowGap?: number | string | undefined
  columnGap?: number | string | undefined
  gap?: number | string | undefined
}>

type ShadowStyle = Readonly<{
  shadowColor?: ColorValue | undefined
  shadowOffset?: Readonly<{ width?: number | undefined; height?: number | undefined }> | undefined
  shadowOpacity?: number | undefined
  shadowRadius?: number | undefined
}>

type KeysOfUnion<T> = T extends unknown ? keyof T : never
type ValueOfUnion<T, K> = T extends unknown ? (K extends keyof T ? T[K] : never) : never
type MergeUnion<T> = { [K in KeysOfUnion<T>]?: ValueOfUnion<T, K> }
// One key at most, as in React Native: `{ rotate: '45deg', scale: 2 }` is two operations.
type MaximumOneOf<T> = {
  [K in keyof T]: { [P in keyof T]?: P extends K ? T[P] : never }
}[keyof T]

type TransformOperation = Readonly<
  MaximumOneOf<
    MergeUnion<
      | { readonly perspective: number }
      | { readonly rotate: string }
      | { readonly rotateX: string }
      | { readonly rotateY: string }
      | { readonly rotateZ: string }
      | { readonly scale: number }
      | { readonly scaleX: number }
      | { readonly scaleY: number }
      | { readonly translateX: number | string }
      | { readonly translateY: number | string }
      | { readonly translate: [number | string, number | string] }
      | { readonly skewX: string }
      | { readonly skewY: string }
      | { readonly matrix: ReadonlyArray<number> }
    >
  >
>

export type TransformsStyle = Readonly<{
  transform?: ReadonlyArray<TransformOperation> | string | undefined
  transformOrigin?: [string | number, string | number, string | number] | string | undefined
}>

export type FilterFunction =
  | { brightness: number | string }
  | { blur: number | string }
  | { contrast: number | string }
  | { grayscale: number | string }
  | { hueRotate: number | string }
  | { invert: number | string }
  | { opacity: number | string }
  | { saturate: number | string }
  | { sepia: number | string }
  | { dropShadow: DropShadowValue | string }

export type DropShadowValue = {
  offsetX: number | string
  offsetY: number | string
  standardDeviation?: number | string | undefined
  color?: ColorValue | undefined
}

type ColorStops = ReadonlyArray<{
  color: ColorValue
  positions?: ReadonlyArray<string> | undefined
}>

type LinearGradientValue = {
  type: 'linear-gradient'
  direction?: string | undefined
  colorStops: ColorStops
}

type EdgePosition =
  | { top: number | string; left: number | string }
  | { top: number | string; right: number | string }
  | { bottom: number | string; left: number | string }
  | { bottom: number | string; right: number | string }

type RadialGradientPosition = EdgePosition

type RadialGradientShape = 'circle' | 'ellipse'

type RadialGradientSize =
  | 'closest-corner'
  | 'closest-side'
  | 'farthest-corner'
  | 'farthest-side'
  | { x: string | number; y: string | number }

type RadialGradientValue = {
  type: 'radial-gradient'
  shape: RadialGradientShape
  size: RadialGradientSize
  position: RadialGradientPosition
  colorStops: ColorStops
}

type BackgroundImageValue = LinearGradientValue | RadialGradientValue

type BackgroundSizeValue = { x: string | number; y: string | number }

type BackgroundRepeatKeyword = 'repeat' | 'space' | 'round' | 'no-repeat'

type BackgroundPositionValue = EdgePosition

type BackgroundRepeatValue = { x: BackgroundRepeatKeyword; y: BackgroundRepeatKeyword }

export type BoxShadowValue = {
  offsetX: number | string
  offsetY: number | string
  color?: ColorValue | undefined
  blurRadius?: number | string | undefined
  spreadDistance?: number | string | undefined
  inset?: boolean | undefined
}

type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity'
  | 'plus-lighter'

type ViewStyleBase = Readonly<{
  backfaceVisibility?: 'visible' | 'hidden' | undefined
  backgroundColor?: ColorValue | undefined
  borderColor?: ColorValue | undefined
  borderCurve?: 'circular' | 'continuous' | undefined
  borderBottomColor?: ColorValue | undefined
  borderEndColor?: ColorValue | undefined
  borderLeftColor?: ColorValue | undefined
  borderRightColor?: ColorValue | undefined
  borderStartColor?: ColorValue | undefined
  borderTopColor?: ColorValue | undefined
  borderBlockColor?: ColorValue | undefined
  borderBlockEndColor?: ColorValue | undefined
  borderBlockStartColor?: ColorValue | undefined
  borderRadius?: number | string | undefined
  borderBottomEndRadius?: number | string | undefined
  borderBottomLeftRadius?: number | string | undefined
  borderBottomRightRadius?: number | string | undefined
  borderBottomStartRadius?: number | string | undefined
  borderEndEndRadius?: number | string | undefined
  borderEndStartRadius?: number | string | undefined
  borderStartEndRadius?: number | string | undefined
  borderStartStartRadius?: number | string | undefined
  borderTopEndRadius?: number | string | undefined
  borderTopLeftRadius?: number | string | undefined
  borderTopRightRadius?: number | string | undefined
  borderTopStartRadius?: number | string | undefined
  borderStyle?: 'solid' | 'dotted' | 'dashed' | undefined
  opacity?: number | undefined
  outlineColor?: ColorValue | undefined
  outlineOffset?: number | undefined
  outlineStyle?: 'solid' | 'dotted' | 'dashed' | undefined
  outlineWidth?: number | undefined
  elevation?: number | undefined
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only' | undefined
  cursor?: CursorValue | undefined
  boxShadow?: ReadonlyArray<BoxShadowValue> | string | undefined
  filter?: ReadonlyArray<FilterFunction> | string | undefined
  mixBlendMode?: BlendMode | undefined
  backgroundImage?: ReadonlyArray<BackgroundImageValue> | string | undefined
  experimental_backgroundImage?: ReadonlyArray<BackgroundImageValue> | string | undefined
  backgroundSize?: ReadonlyArray<BackgroundSizeValue> | string | undefined
  experimental_backgroundSize?: ReadonlyArray<BackgroundSizeValue> | string | undefined
  backgroundPosition?: ReadonlyArray<BackgroundPositionValue> | string | undefined
  experimental_backgroundPosition?: ReadonlyArray<BackgroundPositionValue> | string | undefined
  backgroundRepeat?: ReadonlyArray<BackgroundRepeatValue> | string | undefined
  experimental_backgroundRepeat?: ReadonlyArray<BackgroundRepeatValue> | string | undefined
  isolation?: 'auto' | 'isolate' | undefined
}>

type WebOnlyViewStyle = Readonly<{
  // The browser reads it before a gesture starts, so a drag on a touch screen needs it. See the
  // PanResponder docs.
  touchAction?: CSSProperties['touchAction'] | undefined
}>

export interface ViewStyle
  extends LayoutStyle, ShadowStyle, TransformsStyle, ViewStyleBase, WebOnlyViewStyle {}

type FontWeight =
  | 'normal'
  | 'bold'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900'
  | 100
  | 200
  | 300
  | 400
  | 500
  | 600
  | 700
  | 800
  | 900
  | 'ultralight'
  | 'thin'
  | 'light'
  | 'medium'
  | 'regular'
  | 'semibold'
  | 'condensedBold'
  | 'condensed'
  | 'heavy'
  | 'black'

export type FontVariant =
  | 'small-caps'
  | 'oldstyle-nums'
  | 'lining-nums'
  | 'tabular-nums'
  | 'common-ligatures'
  | 'no-common-ligatures'
  | 'discretionary-ligatures'
  | 'no-discretionary-ligatures'
  | 'historical-ligatures'
  | 'no-historical-ligatures'
  | 'contextual'
  | 'no-contextual'
  | 'proportional-nums'
  | 'stylistic-one'
  | 'stylistic-two'
  | 'stylistic-three'
  | 'stylistic-four'
  | 'stylistic-five'
  | 'stylistic-six'
  | 'stylistic-seven'
  | 'stylistic-eight'
  | 'stylistic-nine'
  | 'stylistic-ten'
  | 'stylistic-eleven'
  | 'stylistic-twelve'
  | 'stylistic-thirteen'
  | 'stylistic-fourteen'
  | 'stylistic-fifteen'
  | 'stylistic-sixteen'
  | 'stylistic-seventeen'
  | 'stylistic-eighteen'
  | 'stylistic-nineteen'
  | 'stylistic-twenty'

type TextStyleBase = Readonly<{
  color?: ColorValue | undefined
  fontFamily?: string | undefined
  fontSize?: number | undefined
  fontStyle?: 'normal' | 'italic' | undefined
  fontWeight?: FontWeight | undefined
  fontVariant?: ReadonlyArray<FontVariant> | string | undefined
  fontVariationSettings?: string | Readonly<{ [axis: string]: number }> | undefined
  textShadowOffset?: Readonly<{ width: number; height: number }> | undefined
  textShadowRadius?: number | undefined
  textShadowColor?: ColorValue | undefined
  letterSpacing?: number | undefined
  lineHeight?: number | undefined
  textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify' | 'start' | 'end' | undefined
  textAlignVertical?: 'auto' | 'top' | 'bottom' | 'center' | undefined
  includeFontPadding?: boolean | undefined
  textDecorationLine?: 'none' | 'underline' | 'line-through' | 'underline line-through' | undefined
  textDecorationStyle?: 'solid' | 'double' | 'dotted' | 'dashed' | 'wavy' | undefined
  textDecorationColor?: ColorValue | undefined
  textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase' | undefined
  userSelect?: 'auto' | 'text' | 'none' | 'contain' | 'all' | undefined
  verticalAlign?: 'auto' | 'top' | 'bottom' | 'middle' | undefined
  writingDirection?: 'auto' | 'ltr' | 'rtl' | undefined
}>

export interface TextStyle extends ViewStyle, TextStyleBase {}

type ImageStyleBase = Readonly<{
  resizeMode?: ImageResizeMode | undefined
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none' | undefined
  tintColor?: ColorValue | undefined
  overlayColor?: ColorValue | undefined
}>

export interface ImageStyle extends Omit<ViewStyle, 'overflow'>, ImageStyleBase {
  readonly overflow?: 'visible' | 'hidden' | undefined
}

/** Every style key of every component, the type that `StyleSheet.create` checks. */
type AnyStyle = Omit<TextStyle, keyof ImageStyleBase> & ImageStyleBase

export type NamedStyles = { readonly [name: string]: Partial<AnyStyle> }

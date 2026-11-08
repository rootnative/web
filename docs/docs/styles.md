---
id: styles
title: Styles
description: How React Native styles become CSS on the web, with the same defaults, units, flex rules, and shorthand order as native.
---

# Styles

You style with the `style` prop and `StyleSheet.create`, as on native. At runtime, each declaration becomes one atomic CSS class, and every element with the same declaration shares that class.

```tsx
const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, backgroundColor: '#fff' },
})
```

Prefer `StyleSheet.create` for static styles. Its objects are frozen, so their class names compile once. An inline style object compiles again on each render.

## Defaults

Every `View` starts with the React Native defaults: `display: flex`, `flexDirection: 'column'`, `alignItems: 'stretch'`, `flexShrink: 0`, `position: 'relative'`, and a border box.

Every `Text` starts at 14 px, black, in the system font, and keeps its spaces and line breaks.

## Values

- **Numbers get `px`.** `padding: 16` is `16px`, and `lineHeight: 20` is `20px`, as on native. `flex`, `flexGrow`, `flexShrink`, `opacity`, `zIndex`, `aspectRatio`, and `fontWeight` stay unitless.
- **Strings pass through.** `'50%'` and `'auto'` work as they do on native.
- **Colors use the React Native parser.** Named colors, hex, `rgb()`, `hsl()`, and `hwb()` all work. A color that React Native can't parse is dropped.

## Flex

`flex` follows the React Native rules, not the CSS ones:

| Value      | CSS        | Meaning                                        |
| ---------- | ---------- | ---------------------------------------------- |
| `flex: 1`  | `1 1 0%`   | Grow and shrink, from a size of 0              |
| `flex: 0`  | `0 0 auto` | Keep the size of the content                   |
| `flex: -1` | `0 1 auto` | Keep the size of the content, shrink if needed |

`gap`, `inset`, `display: 'contents'`, and `position: 'static'` pass through to CSS.

## Shorthands and longhands

A longhand always wins over a shorthand, whatever the key order, as on native:

```tsx
// The top padding is 16. The other three sides are 8.
const styles = StyleSheet.create({ box: { paddingTop: 16, padding: 8 } })
```

## Right-to-left

The start and end props map to CSS logical properties, so the browser flips them when the page direction is right-to-left:

| Prop                                                                                             | CSS                                        |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `marginStart`, `marginEnd`, `paddingStart`, `paddingEnd`                                         | `margin-inline-start` and the others       |
| `start`, `end`                                                                                   | `inset-inline-start`, `inset-inline-end`   |
| `borderStartWidth`, `borderEndWidth`, `borderStartColor`, `borderEndColor`                       | `border-inline-start-width` and the others |
| `borderTopStartRadius`, `borderTopEndRadius`, `borderBottomStartRadius`, `borderBottomEndRadius` | `border-start-start-radius` and the others |

`marginHorizontal` and `paddingHorizontal` set the left and right sides, as on native.

## Transforms, shadows, and filters

- **`transform`** takes the React Native array, for example `[{ translateX: 10 }, { rotate: '45deg' }]`, or a CSS string. `transformOrigin` works too.
- **`boxShadow`** takes the React Native object array or a CSS string.
- **`shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`** become a `box-shadow` when you don't set `boxShadow`.
- **`textShadowColor`, `textShadowOffset`, `textShadowRadius`** become a `text-shadow`.
- **`filter`** takes the React Native array, for example `[{ blur: 4 }]`, or a CSS string.

## Fonts

- `fontFamily: 'System'` is the system font stack of the browser.
- The named weights (`'thin'`, `'light'`, `'medium'`, `'semibold'`, `'heavy'`, `'black'`, and the others) become their numbers.
- `fontVariant` takes the React Native array.

## Native-only style props

`elevation`, `borderCurve`, `includeFontPadding`, and `overlayColor` have no web effect. The package accepts them and ignores them.

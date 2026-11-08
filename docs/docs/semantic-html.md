---
id: semantic-html
title: Semantic HTML
description: The role prop picks the HTML element, so a React Native tree renders as real landmarks, headings, lists, and links.
---

# Semantic HTML

The `role` prop picks the HTML element. You don't need a web-only component or a web-only prop.

```tsx
<View role="main">
  <View role="navigation" />
  <Text role="heading" aria-level={1}>
    Title
  </Text>
  <View role="list">
    <View role="listitem">
      <Text>One</Text>
    </View>
  </View>
  <Text href="/about" role="link">
    About
  </Text>
</View>
```

```html
<main>
  <nav></nav>
  <h1>Title</h1>
  <ul>
    <li><span>One</span></li>
  </ul>
  <a href="/about">About</a>
</main>
```

Screen readers, search engines, and browser features such as reader mode get the same structure that native accessibility tools get.

## Roles that pick an element

| `role`             | Element                                                       |
| ------------------ | ------------------------------------------------------------- |
| `article`          | `<article>`                                                   |
| `banner`           | `<header>`                                                    |
| `button`           | `<button type="button">`, so it never submits a form          |
| `complementary`    | `<aside>`                                                     |
| `contentinfo`      | `<footer>`                                                    |
| `figure`           | `<figure>`                                                    |
| `form`             | `<form>`                                                      |
| `heading`          | `<h1>` to `<h6>`, from `aria-level`. The default level is 2.  |
| `link` with `href` | `<a>`                                                         |
| `list`             | `<ul>`                                                        |
| `listitem`         | `<li>`                                                        |
| `main`             | `<main>`                                                      |
| `navigation`       | `<nav>`                                                       |
| `separator`        | `<hr>`. A separator with children is a `<div>` with the role. |

Every other role keeps the default element, `<div>` for `View` and `<span>` for `Text`, with a `role` attribute.

The table roles (`table`, `row`, `cell`, and the others) also stay on a `<div>` with the ARIA role. A real `<table>` would let the HTML parser move elements around, so the server HTML wouldn't match the React tree, and flex layout wouldn't apply.

## Links

`href` on a `View` or a `Text` renders an `<a>`. You don't need `role="link"` with it. `target`, `rel`, and `download` pass to the anchor. These four props are web only.

`role="link"` without `href` keeps the default element and adds `role="link"`.

## `accessibilityRole`

`accessibilityRole` works too. When you set both, `role` wins. The older names map to their ARIA roles:

| `accessibilityRole`   | Role        |
| --------------------- | ----------- |
| `header`              | `heading`   |
| `image`               | `img`       |
| `imagebutton`         | `button`    |
| `summary`             | `region`    |
| `adjustable`          | `slider`    |
| `search`              | `searchbox` |
| `text`, `keyboardkey` | `none`      |

## Accessibility props

The React Native accessibility props become ARIA attributes:

| Prop                                                                             | Attribute                                                                      |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `accessibilityLabel`                                                             | `aria-label`                                                                   |
| `accessibilityLabelledBy`                                                        | `aria-labelledby`. An array joins with spaces.                                 |
| `accessibilityHint`                                                              | `aria-description`                                                             |
| `accessibilityLiveRegion`                                                        | `aria-live`. `none` is `off`.                                                  |
| `accessibilityState`                                                             | `aria-busy`, `aria-checked`, `aria-disabled`, `aria-expanded`, `aria-selected` |
| `accessibilityValue`                                                             | `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`            |
| `accessibilityViewIsModal`                                                       | `aria-modal`                                                                   |
| `accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"` | `aria-hidden`                                                                  |
| `nativeID`, `id`                                                                 | `id`                                                                           |
| `testID`                                                                         | `data-testid`                                                                  |
| `focusable`                                                                      | `tabIndex` 0, or -1 for `false`. `tabIndex` wins when you set both.            |

`aria-*` props pass through as you write them. An `aria-*` prop wins over the mapped prop with the same meaning.

`data-*`, `lang`, and `dir` pass through too. Any other prop that isn't a React Native prop is dropped, so it never reaches the element.

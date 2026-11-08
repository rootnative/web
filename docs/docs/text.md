---
id: text
title: Text
description: Renders text in a span, or the element that its role picks, with the React Native text defaults, line clamping, and nesting.
---

# `Text`

Renders text in a `<span>`, or the element that its [`role`](/semantic-html) picks.

```tsx
import { Text } from 'react-native'

export function Byline({ author }) {
  return (
    <Text numberOfLines={1}>
      By <Text style={{ fontWeight: 'bold' }}>{author}</Text>
    </Text>
  )
}
```

A `Text` starts at 14 px, black, in the system font, and keeps its spaces and line breaks, as on native. A `Text` inside a `Text` takes the font, color, alignment, and decoration of its parent.

## Props

| Prop                                 | On the web                                                                                                             |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `style`                              | Compiles to atomic CSS. See [Styles](/styles).                                                                         |
| `numberOfLines`                      | `1` keeps the text on one line and ends it with an ellipsis. A larger number clamps the text to that many lines.       |
| `ellipsizeMode`                      | `tail` (the default) and `clip`. `head` and `middle` show the ellipsis at the end for now.                             |
| `selectable`                         | The text is selectable by default, as web users expect. On native the default is `false`. `false` turns selection off. |
| `selectionColor`                     | The background color of selected text.                                                                                 |
| `onPress`                            | A click. It gets the DOM click event.                                                                                  |
| `disabled`                           | Sets `aria-disabled`, and `onPress` doesn't fire.                                                                      |
| `role`, accessibility props          | See [Semantic HTML](/semantic-html).                                                                                   |
| `onLayout`, `pointerEvents`          | As on [`View`](/view).                                                                                                 |
| `nativeID`, `id`, `testID`           | `id`, `id`, and `data-testid`.                                                                                         |
| `href`                               | **Web only.** Renders an `<a>`.                                                                                        |
| `target`, `rel`, `download`          | **Web only.** Pass to the anchor.                                                                                      |
| `lang`                               | **Web only.** The language of the text, for screen readers and hyphenation.                                            |
| `aria-level`                         | **Web only.** The heading level of `role="heading"`, 1 to 6.                                                           |
| `onClick` and the other DOM handlers | **Web only.** Pass to the element. `onClick` runs before `onPress`, and `preventDefault()` in it stops `onPress`.      |

`onPressIn`, `onPressOut`, and `onLongPress` aren't on `Text` yet.

:::tip Make a pressable text reachable by keyboard

A `Text` with `onPress` is a `<span>`, and a keyboard can't focus it. To go to a page, give it an `href`. For an action, wrap it in a [`Pressable`](/pressable) with `role="button"`.

:::

## Ref

The ref is the DOM element.

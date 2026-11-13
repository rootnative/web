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

| Prop                                 | On the web                                                                                                                        |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `style`                              | Compiles to atomic CSS. See [Styles](/styles).                                                                                    |
| `numberOfLines`                      | `1` keeps the text on one line and ends it with an ellipsis. A larger number clamps the text to that many lines.                  |
| `ellipsizeMode`                      | `tail` (the default) and `clip`. `head` and `middle` show the ellipsis at the end for now.                                        |
| `selectable`                         | The text is selectable by default, as web users expect. On native the default is `false`. `false` turns selection off.            |
| `selectionColor`                     | The background color of selected text.                                                                                            |
| `onPress`, `onPressIn`, `onPressOut` | As on [`Pressable`](/pressable#how-a-press-works): a pointer, Enter or Space, or a click. The event is a `GestureResponderEvent`. |
| `onLongPress`                        | A press held for 500 ms. `onPress` then doesn't fire.                                                                             |
| `pressRetentionOffset`               | How far a pointer can leave the text and still press it, as on `Pressable`.                                                       |
| `suppressHighlighting`               | Ignored, as on Android. Only iOS highlights a pressed `Text`.                                                                     |
| `disabled`                           | Sets `aria-disabled`. The `Text` isn't pressable, so a pressable parent gets the press.                                           |
| `role`, accessibility props          | See [Semantic HTML](/semantic-html).                                                                                              |
| `onLayout`, `pointerEvents`          | As on [`View`](/view).                                                                                                            |
| `nativeID`, `id`, `testID`           | `id`, `id`, and `data-testid`.                                                                                                    |
| `href`                               | **Web only.** Renders an `<a>`.                                                                                                   |
| `target`, `rel`, `download`          | **Web only.** Pass to the anchor.                                                                                                 |
| `lang`                               | **Web only.** The language of the text, for screen readers and hyphenation.                                                       |
| `aria-level`                         | **Web only.** The heading level of `role="heading"`, 1 to 6.                                                                      |
| `onClick` and the other DOM handlers | **Web only.** Pass to the element. On a pressable `Text`, they run before the press handlers, and both run.                       |

As on native, only `onPress` or `onLongPress` makes a `Text` pressable. A `Text` with only `onPressIn` or `onPressOut` doesn't respond.

:::note A pressable text is a link

As on native, a pressable `Text` with no `role` has the role `link`. It's in the tab order, and Enter or Space presses it. With an `href`, it renders an `<a>`. For an action, set `role="button"`, and it renders a `<button>`.

:::

## Ref

The ref is the DOM element. It has the measure methods of [`View`](/view#ref). The type is `TextInstance`.

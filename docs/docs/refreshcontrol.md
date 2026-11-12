---
id: refreshcontrol
title: RefreshControl
description: Pull to refresh on the web, with touch and Android's indicator. Pass it to a ScrollView as refreshControl.
---

# `RefreshControl`

Pull to refresh. Pass it to a `ScrollView` as `refreshControl`, or give a [`FlatList`](/flatlist) `onRefresh` and `refreshing`. When the user pulls down at the top of the list and lets go, `onRefresh` runs. Set `refreshing` while the data loads.

```tsx
import { useState } from 'react'
import { RefreshControl, ScrollView, Text } from 'react-native'

export function Feed({ load }: { load: () => Promise<void> }) {
  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = () => {
    setRefreshing(true)
    load().finally(() => setRefreshing(false))
  }
  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text>…</Text>
    </ScrollView>
  )
}
```

It works as on Android: the control wraps the scroll box, and an indicator on a white disc comes down from the top.

## The pull

- The pull works with touch only. A mouse, a pen, or a keyboard has no pull, so give these users a refresh button too.
- A pull starts when the list is at the top and the finger first moves down. The page doesn't scroll or bounce during the pull.
- The indicator moves half as far as the finger. A release after 128 px of finger travel calls `onRefresh`. A shorter pull goes back.
- `onRefresh` should set `refreshing` to `true` at once. When it doesn't, the indicator goes back after the release, as on native.
- There's no pull while `refreshing` is `true`.
- In a flipped scroller, such as an `inverted` `FlatList`, the indicator sits at the bottom and the pull goes up, as on native.

## Props

| Prop                      | On the web                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------- |
| `refreshing`              | Shows the indicator at rest and turns the arc. Sets `aria-busy` on the wrapper.         |
| `onRefresh`               | Called after a pull past the target.                                                    |
| `progressViewOffset`      | Moves the indicator down, for example under a header.                                   |
| `colors`                  | The first color is the arc. Android cycles the colors, and the web uses only the first. |
| `progressBackgroundColor` | The disc. The default is white.                                                         |
| `size`                    | `'default'` is a 40 px disc, `'large'` 56 px.                                           |
| `enabled`                 | `false` turns the pull off. The indicator still shows while `refreshing`.               |
| `tintColor`               | The arc when `colors` is empty. The default is black, as on Android.                    |
| `title`                   | The accessible name of the indicator. The web shows no text.                            |
| `titleColor`              | No effect.                                                                              |
| View props                | Go to the wrapper, as on [`View`](/view).                                               |

The arc turns also when the system asks for reduced motion, because it's the only sign that the list is busy.

## Layout

`ScrollView` gives the control the style props that place the box: the margins, `flex`, the sizes, the position props, `transform`, and the gaps. The scroll box fills the control and keeps the rest of the style, for example the background and the padding. React Native does the same on Android.

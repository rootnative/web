---
id: flatlist
title: FlatList
description: A list on top of ScrollView, with separators, columns, inversion, viewability, edge callbacks, and the React Native ref methods. No virtualizer yet.
---

# `FlatList`

A list on top of [`ScrollView`](/scrollview), with the React Native `FlatList` API.

```tsx
import { FlatList, Text } from 'react-native'

export function Contacts({ contacts }) {
  return (
    <FlatList
      data={contacts}
      keyExtractor={(contact) => contact.id}
      renderItem={({ item }) => <Text>{item.name}</Text>}
      onEndReached={loadMore}
    />
  )
}
```

:::warning No virtualizer yet

`FlatList` renders every item, so each one costs DOM memory and render time. Load a long list in pages with `onEndReached`.

:::

Each item sits in a cell `View`, with its separator after it, as on native. The default `keyExtractor` uses `key`, then `id`, then the index, as on native.

## Props

| Prop                                                               | On the web                                                                                                                                                                                                                          |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data`, `renderItem`, `ListItemComponent`, `keyExtractor`          | As on native.                                                                                                                                                                                                                       |
| `ItemSeparatorComponent`                                           | Gets `highlighted` and `leadingItem`. `separators.highlight()`, `unhighlight()`, and `updateProps()` in `renderItem` work.                                                                                                          |
| `ListHeaderComponent`, `ListFooterComponent`, `ListEmptyComponent` | A component or an element. `ListHeaderComponentStyle` and `ListFooterComponentStyle` style their wrappers.                                                                                                                          |
| `numColumns`, `columnWrapperStyle`                                 | Groups the items into rows. A row's key joins the keys of its items.                                                                                                                                                                |
| `horizontal`                                                       | A row of items.                                                                                                                                                                                                                     |
| `inverted`                                                         | Flips the scroller and each cell with a transform, as on native, so the first item is at the bottom.                                                                                                                                |
| `initialScrollIndex`                                               | Scrolls to that item on mount.                                                                                                                                                                                                      |
| `onViewableItemsChanged`, `viewabilityConfig`                      | The React Native rules: an item is viewable when it's whole in the viewport, or when its visible part reaches `itemVisiblePercentThreshold` or `viewAreaCoveragePercentThreshold`. `minimumViewTime` and `waitForInteraction` work. |
| `viewabilityConfigCallbackPairs`                                   | Works, as on native.                                                                                                                                                                                                                |
| `onEndReached`, `onEndReachedThreshold`                            | Fires once per content length, when the scroll comes within the threshold of the end. The threshold is a share of the viewport. Without one, it's 2 px, as on native. A list shorter than its viewport fires it after mount.        |
| `onStartReached`, `onStartReachedThreshold`                        | The same, at the start.                                                                                                                                                                                                             |
| `CellRendererComponent`                                            | Renders inside the cell `View`, with `cellKey`, `index`, `item`, `style`, and the item and separator as children.                                                                                                                   |
| `renderScrollComponent`                                            | Renders the scroller. It gets the scroll props, without the ref.                                                                                                                                                                    |
| `stickyHeaderIndices`                                              | As on `ScrollView`. With every item rendered, the indices match native.                                                                                                                                                             |
| `onRefresh`, `refreshing`                                          | Accepted, but no indicator shows until `RefreshControl` ships. Pass `refreshControl` to use your own.                                                                                                                               |
| ScrollView props                                                   | As on [`ScrollView`](/scrollview).                                                                                                                                                                                                  |

These virtualizer props are accepted and ignored: `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, `updateCellsBatchingPeriod`, `removeClippedSubviews`, `disableVirtualization`, `extraData`, and `getItemLayout`. Every cell is in the DOM, so the list measures each one there.

## Ref

The ref is an object with the React Native methods:

| Method                                                                | On the web                                                 |
| --------------------------------------------------------------------- | ---------------------------------------------------------- |
| `scrollToOffset({ offset, animated })`                                | As on native.                                              |
| `scrollToIndex({ index, viewPosition, viewOffset, animated })`        | As on native. With `numColumns`, the index is a row index. |
| `scrollToItem({ item, viewPosition, viewOffset, animated })`          | Finds the row of the item and scrolls to it.               |
| `scrollToEnd({ animated })`                                           | Scrolls to the end.                                        |
| `recordInteraction()`                                                 | Starts viewability for `waitForInteraction`.               |
| `getScrollableNode()`, `getNativeScrollRef()`, `getScrollResponder()` | The scroll element of the `ScrollView`.                    |
| `flashScrollIndicators()`, `setNativeProps()`                         | Do nothing.                                                |

`onScrollToIndexFailed` never fires, because every cell is in the DOM.

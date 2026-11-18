---
id: flatlist
title: FlatList
description: A list of an array on top of VirtualizedList, with columns, separators, inversion, viewability, edge callbacks, pull to refresh, and the React Native ref methods.
---

# `FlatList`

A list of an array, with the React Native `FlatList` API. It sits on top of [`VirtualizedList`](/virtualizedlist), so it renders a window of items around the viewport, and a spacer takes the place of the other items. The [window rules](/virtualizedlist#the-window) are on the `VirtualizedList` page.

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

Each item sits in a cell `View`, with its separator after it, as on native. The default `keyExtractor` uses `key`, then `id`, then the index, as on native. An item outside the window unmounts, so keep its state in the item data or in a store.

:::note Server rendering

A server render has only the first `initialNumToRender` items, 10 by default. When every item must be in the HTML, for example for SEO, set `initialNumToRender` to the item count.

:::

## Props

| Prop                                                                                                            | On the web                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data`, `renderItem`, `ListItemComponent`, `keyExtractor`                                                       | As on native. With no `renderItem` and no `ListItemComponent`, the cells are empty, as on native.                                                                                                                                                              |
| `getItemLayout`                                                                                                 | Gives the `length` and `offset` of each item, or of each row with `numColumns`. The list then measures nothing, each spacer has the exact size, and `scrollToIndex` reaches any item.                                                                          |
| `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, `updateCellsBatchingPeriod`, `disableVirtualization` | As on [`VirtualizedList`](/virtualizedlist).                                                                                                                                                                                                                   |
| `ItemSeparatorComponent`                                                                                        | Gets `highlighted` and `leadingItem`. `separators.highlight()`, `unhighlight()`, and `updateProps()` in `renderItem` work.                                                                                                                                     |
| `ListHeaderComponent`, `ListFooterComponent`, `ListEmptyComponent`                                              | A component or an element. `ListHeaderComponentStyle` and `ListFooterComponentStyle` style their wrappers.                                                                                                                                                     |
| `numColumns`, `columnWrapperStyle`                                                                              | Groups the items into rows. A row's key joins the keys of its items. As on native, `columnWrapperStyle` with one column throws, and a change of `numColumns` throws.                                                                                           |
| `horizontal`                                                                                                    | A row of items. In a right-to-left direction, the first item is at the right edge.                                                                                                                                                                             |
| `inverted`                                                                                                      | Flips the scroller and each cell with a transform, as on native, so the first item is at the bottom.                                                                                                                                                           |
| `initialScrollIndex`                                                                                            | The first render starts at that item, and the first paint shows it. Without `getItemLayout`, nothing is above the item until the items above it render.                                                                                                        |
| `onViewableItemsChanged`, `viewabilityConfig`                                                                   | The React Native rules: an item is viewable when it's whole in the viewport, or when its visible part reaches `itemVisiblePercentThreshold` or `viewAreaCoveragePercentThreshold`. Only rendered items count. `minimumViewTime` and `waitForInteraction` work. |
| `viewabilityConfigCallbackPairs`                                                                                | Works, as on native. With `onViewableItemsChanged` too, the list throws. A change of the pairs, of `viewabilityConfig`, or of whether `onViewableItemsChanged` is set throws, as on native.                                                                    |
| `onEndReached`, `onEndReachedThreshold`                                                                         | Fires once per content length, when the window has the last item and the scroll comes within the threshold of the end. The threshold is a share of the viewport. Without one, it's 2 px, as on native. A list shorter than its viewport fires it after mount.  |
| `onStartReached`, `onStartReachedThreshold`                                                                     | The same, at the start.                                                                                                                                                                                                                                        |
| `onScrollToIndexFailed`                                                                                         | Fires when `scrollToIndex` asks for an item after the last measured one, and there's no `getItemLayout`. Without it, the call throws.                                                                                                                          |
| `CellRendererComponent`                                                                                         | Renders inside the cell `View`, with `cellKey`, `index`, `item`, `style`, and the item and separator as children.                                                                                                                                              |
| `renderScrollComponent`                                                                                         | Renders the scroller. It gets the scroll props and `onRefresh`, `refreshing`, and `progressViewOffset`, without the ref. The list adds no `RefreshControl` then, as on native.                                                                                 |
| `stickyHeaderIndices`                                                                                           | As on [`ScrollView`](/scrollview). With a `ListHeaderComponent`, the header is index 0.                                                                                                                                                                        |
| `onRefresh`, `refreshing`, `progressViewOffset`                                                                 | Wrap the scroller in a [`RefreshControl`](/refreshcontrol), as on native. With `onRefresh`, `refreshing` must be a boolean, or the list throws. A `refreshControl` prop wins. In an `inverted` list, the pull starts at the bottom and goes up.                |
| `extraData`                                                                                                     | A new value reports the viewable items again, as a new `data` does.                                                                                                                                                                                            |
| ScrollView props                                                                                                | As on [`ScrollView`](/scrollview).                                                                                                                                                                                                                             |

These props are accepted and ignored: `strictMode`, `legacyImplementation`, and `debug`.

## Ref

The ref is an object with the React Native methods:

| Method                                                                | On the web                                                                                                              |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `scrollToOffset({ offset, animated })`                                | As on native.                                                                                                           |
| `scrollToIndex({ index, viewPosition, viewOffset, animated })`        | As on native. With `numColumns`, the index is a row index. See `onScrollToIndexFailed` for an item that isn't measured. |
| `scrollToItem({ item, viewPosition, viewOffset, animated })`          | Finds the row of the item and scrolls to it.                                                                            |
| `scrollToEnd({ animated })`                                           | Scrolls to the end of the last item and the footer. Without `getItemLayout`, the end is an estimate.                    |
| `recordInteraction()`                                                 | Starts viewability for `waitForInteraction`.                                                                            |
| `getScrollableNode()`, `getNativeScrollRef()`, `getScrollResponder()` | The scroll element of the `ScrollView`.                                                                                 |
| `setNativeProps({ style })`                                           | Writes the style on the scroll element.                                                                                 |
| `flashScrollIndicators()`                                             | Does nothing, as on `ScrollView`.                                                                                       |

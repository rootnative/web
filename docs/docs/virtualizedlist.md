---
id: virtualizedlist
title: VirtualizedList
description: The list that renders only a window of its items, with spacers for the rest, and reads any collection through getItem and getItemCount.
---

# `VirtualizedList`

React Native's list that renders only a window of cells around the viewport. A spacer takes the place of the other cells. The list reads the data through `getItem` and `getItemCount`, so the data can be any collection, not only an array.

```tsx
import { Text, VirtualizedList } from 'react-native'

export function Messages({ messages }) {
  return (
    <VirtualizedList
      data={messages}
      getItemCount={(data) => data.size}
      getItem={(data, index) => data.get(index)}
      keyExtractor={(message) => message.id}
      renderItem={({ item }) => <Text>{item.text}</Text>}
    />
  )
}
```

## The window

The list follows the rules of React Native:

1. The first render has the first `initialNumToRender` cells, or the cells from `initialScrollIndex`.
2. After the first layout, the list adds `maxToRenderPerBatch` cells at a time, until the window covers `windowSize` viewports: the viewport, and half of the other viewports on each side of it.
3. A scroll moves the window. When the viewport comes near cells that aren't rendered, the next batch renders at once. Otherwise it waits `updateCellsBatchingPeriod`.

Some cells stay rendered outside the window:

- The first `initialNumToRender` cells, so a scroll back to the top shows them at once. With an `initialScrollIndex` above 0, they don't stay.
- The closest sticky header before the window.
- A viewport of cells on each side of the cell that has the focus, so the Tab key finds the next cell.

A cell outside the window unmounts, and its state goes with it. Keep the state in the item data or in a store.

### Cell sizes

With `getItemLayout`, the list knows the place of each cell at once. It measures nothing, each spacer has the exact size, and `scrollToIndex` reaches any cell.

Without `getItemLayout`, the list measures the rendered cells, and it estimates the other cells from the average length. The content then ends at the last measured cell. A scroll stops there, and the next batch moves the end further.

:::note Server rendering

A server render has only the first `initialNumToRender` cells, as the first render on native. When every item must be in the HTML, for example for SEO, set `initialNumToRender` to the item count.

:::

## Props

| Prop                                                                                   | On the web                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `data`, `getItem`, `getItemCount`                                                      | `getItem(data, index)` and `getItemCount(data)` read the data. The list throws without one of them.                                                                                                    |
| `renderItem`, `ListItemComponent`                                                      | As on native. With both, `ListItemComponent` wins, and the list logs a warning.                                                                                                                        |
| `keyExtractor`                                                                         | The default uses `key`, then `id`, then the index, as on native. An item with no `key` or `id` logs a warning.                                                                                         |
| `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, `updateCellsBatchingPeriod` | As on native. The defaults are 10 cells, 10 cells, 21 viewports, and 50 ms.                                                                                                                            |
| `getItemLayout`                                                                        | Gives the `length` and `offset` of each cell. See [Cell sizes](#cell-sizes).                                                                                                                           |
| `initialScrollIndex`                                                                   | The first render starts at that cell, and the first paint shows it. Without `getItemLayout`, nothing is above the cell until the cells above it render.                                                |
| `disableVirtualization`                                                                | No spacers, and no cell unmounts. Near the end, the list adds a batch.                                                                                                                                 |
| `ItemSeparatorComponent`                                                               | Gets `highlighted` and `leadingItem`. `separators.highlight()`, `unhighlight()`, and `updateProps()` in `renderItem` work.                                                                             |
| `ListHeaderComponent`, `ListFooterComponent`, `ListEmptyComponent`                     | A component or an element. `ListHeaderComponentStyle` and `ListFooterComponentStyle` style their wrappers. `ListEmptyComponent` gets the flip of `inverted` in its `style`, as on native.              |
| `horizontal`                                                                           | A row of cells. In a right-to-left direction, the first cell is at the right edge, and offsets count from there, as on native. The list reads the direction of its scroll element.                     |
| `inverted`                                                                             | Flips the scroller and each cell with a transform, as on native, so the first cell is at the bottom.                                                                                                   |
| `onViewableItemsChanged`, `viewabilityConfig`, `viewabilityConfigCallbackPairs`        | The React Native rules. Only rendered cells count.                                                                                                                                                     |
| `onEndReached`, `onEndReachedThreshold`                                                | Fires once per content length, when the window has the last cell and the scroll comes within the threshold of the end. The threshold is a share of the viewport. Without one, it's 2 px, as on native. |
| `onStartReached`, `onStartReachedThreshold`                                            | The same, at the start.                                                                                                                                                                                |
| `onScrollToIndexFailed`                                                                | Fires when `scrollToIndex` asks for a cell after the last measured cell, and there's no `getItemLayout`. It gets `index`, `highestMeasuredFrameIndex`, and `averageItemLength`.                        |
| `CellRendererComponent`                                                                | Renders inside the cell `View`, with `cellKey`, `index`, `item`, `style`, and the item and separator as children.                                                                                      |
| `renderScrollComponent`                                                                | Renders the scroller. It gets the scroll props and `onRefresh`, `refreshing`, and `progressViewOffset`, without the ref. The list adds no `RefreshControl` then, as on native.                         |
| `stickyHeaderIndices`                                                                  | As on [`ScrollView`](/scrollview). With a `ListHeaderComponent`, the header is index 0.                                                                                                                |
| `onRefresh`, `refreshing`, `progressViewOffset`                                        | Wrap the scroller in a [`RefreshControl`](/refreshcontrol), as on native. With `onRefresh`, `refreshing` must be a boolean, or the list throws. A `refreshControl` prop wins.                          |
| `extraData`                                                                            | A new value reports the viewable items again, as a new `data` does.                                                                                                                                    |
| `debug`                                                                                | Accepted and ignored. No overlay.                                                                                                                                                                      |
| ScrollView props                                                                       | As on [`ScrollView`](/scrollview).                                                                                                                                                                     |

Not there yet:

- `maintainVisibleContentPosition` has no effect.
- A list inside a cell of a list with the same direction scrolls on its own. On native, the outer list scrolls both.

## Ref

The ref is an object with the React Native methods:

| Method                                                         | On the web                                                                                           |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `scrollToOffset({ offset, animated })`                         | As on native.                                                                                        |
| `scrollToIndex({ index, viewPosition, viewOffset, animated })` | As on native. A fractional index scrolls into the cell. See `onScrollToIndexFailed` for limits.      |
| `scrollToItem({ item, viewPosition, viewOffset, animated })`   | Finds the item through `getItem` and scrolls to it.                                                  |
| `scrollToEnd({ animated })`                                    | Scrolls to the end of the last cell and the footer. Without `getItemLayout`, the end is an estimate. |
| `recordInteraction()`                                          | Starts viewability for `waitForInteraction`.                                                         |
| `hasMore()`                                                    | `true` while the window doesn't reach the last item.                                                 |
| `getScrollRef()`, `getScrollResponder()`                       | The [`ScrollView`](/scrollview) ref.                                                                 |
| `getScrollableNode()`                                          | The scroll element.                                                                                  |
| `setNativeProps({ style })`                                    | Writes the style on the scroll element.                                                              |
| `flashScrollIndicators()`                                      | Does nothing, as on `ScrollView`.                                                                    |

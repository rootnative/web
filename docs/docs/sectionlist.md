---
id: sectionlist
title: SectionList
description: A list of sections, each with a header, its items, and a footer, on top of VirtualizedList. VirtualizedSectionList is the same list for any collection.
---

# `SectionList`

A list of sections, with the React Native `SectionList` API. Each section has a header, its items, and a footer. It sits on top of [`VirtualizedList`](/virtualizedlist), so it renders a window of cells around the viewport, with the same [window rules](/virtualizedlist#the-window).

```tsx
import { SectionList, Text } from 'react-native'

export function Contacts({ groups }) {
  return (
    <SectionList
      sections={groups.map((group) => ({ title: group.letter, data: group.contacts }))}
      keyExtractor={(contact) => contact.id}
      renderItem={({ item }) => <Text>{item.name}</Text>}
      renderSectionHeader={({ section }) => <Text>{section.title}</Text>}
    />
  )
}
```

The list is one flat list of cells: each section adds a cell for its header, a cell for each item, and a cell for its footer. A cell outside the window unmounts, so keep the state of an item in the item data or in a store.

:::note Server rendering

A server render has only the first `initialNumToRender` cells, 10 by default, and the headers and footers count. When every item must be in the HTML, set `initialNumToRender` to the cell count: the item count, plus 2 for each section.

:::

## Props

| Prop                                         | On the web                                                                                                                                                                                                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sections`                                   | An array of sections. Each section has `data`, and can have `key`, `renderItem`, `ItemSeparatorComponent`, `keyExtractor`, and any other field. Without a `key`, the index of the section is its key.                                                    |
| `renderItem`                                 | Gets `item`, `index` in the section, `section`, and `separators`. The `renderItem` of a section wins.                                                                                                                                                    |
| `renderSectionHeader`, `renderSectionFooter` | Get `section`.                                                                                                                                                                                                                                           |
| `keyExtractor`                               | The default uses `key`, then `id`, then the index, as on native. The `keyExtractor` of a section wins. The key of a cell joins the key of the section and the key of the item.                                                                           |
| `ItemSeparatorComponent`                     | Sits between the items of a section, not after the last one. Gets `highlighted`, `leadingItem`, `trailingItem`, `section`, `leadingSection`, and `trailingSection`. `separators.highlight()`, `unhighlight()`, and `updateProps()` in `renderItem` work. |
| `SectionSeparatorComponent`                  | Sits above the first item and below the last item of each section, with the same props.                                                                                                                                                                  |
| `stickySectionHeadersEnabled`                | The section headers stick to the top until the next one pushes them out. React Native's default is `true` only on iOS, so it's `false` on the web. Set it to `true` for the iOS look.                                                                    |
| `getItemLayout`                              | Gives the `length` and `offset` of each cell of the flat list, the headers and footers too.                                                                                                                                                              |
| `onViewableItemsChanged`                     | Each token has the `index` in the section and the `section`. A header or a footer has the `index` `null`. `viewabilityConfigCallbackPairs` gets the tokens of the flat list, as on native.                                                               |
| Other props                                  | As on [`VirtualizedList`](/virtualizedlist), apart from `data`, `getItem`, and `getItemCount`.                                                                                                                                                           |

## Ref

| Method                                                                              | On the web                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scrollToLocation({ sectionIndex, itemIndex, viewPosition, viewOffset, animated })` | As on native: `itemIndex` 0 is the section header, and 1 is the first item. With sticky headers, an item goes below the header. Without `getItemLayout`, a cell that isn't measured calls `onScrollToIndexFailed`, as on [`VirtualizedList`](/virtualizedlist). |
| `recordInteraction()`                                                               | Starts viewability for `waitForInteraction`.                                                                                                                                                                                                                    |
| `getScrollableNode()`, `getScrollResponder()`                                       | The scroll element.                                                                                                                                                                                                                                             |
| `setNativeProps({ style })`                                                         | Writes the style on the scroll element.                                                                                                                                                                                                                         |
| `flashScrollIndicators()`                                                           | Does nothing, as on [`ScrollView`](/scrollview).                                                                                                                                                                                                                |

## `VirtualizedSectionList`

The list under `SectionList`. It takes `getItem(data, index)` and `getItemCount(data)` and calls them with the `data` of each section, so the data of a section can be any collection. Its `stickySectionHeadersEnabled` is off unless you set it. Its ref has `scrollToLocation()`, and `getListRef()`, which gives the [`VirtualizedList`](/virtualizedlist) ref.

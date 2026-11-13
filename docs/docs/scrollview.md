---
id: scrollview
title: ScrollView
description: A scroll box on one axis, with the React Native scroll events, drag and momentum phases, snapping, sticky headers, and ref methods.
---

# `ScrollView`

A box that scrolls on one axis. It renders an overflow `<div>` with your content in a `View` inside.

```tsx
import { ScrollView, Text } from 'react-native'

export function Feed({ posts }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      {posts.map((post) => (
        <Text key={post.id}>{post.title}</Text>
      ))}
    </ScrollView>
  )
}
```

A `ScrollView` scrolls its own box, not the document. On a phone, the address bar of the browser doesn't hide as you scroll it.

## Scroll events

| Event                                          | On the web                                                                                                                                                                              |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onScroll`                                     | One event per frame. `nativeEvent` is the DOM event with `contentOffset`, `contentSize`, `layoutMeasurement`, `contentInset` (zeros), and `zoomScale` (1) added. There's no `velocity`. |
| `onScrollBeginDrag`, `onScrollEndDrag`         | A scroll while a pointer is down is a drag: a finger, or a mouse on the scrollbar. The drag ends when the pointer comes up.                                                             |
| `onMomentumScrollBegin`, `onMomentumScrollEnd` | A scroll after the release is momentum. So is a scroll with no pointer down: the wheel, the keyboard, or `scrollTo`.                                                                    |
| `onContentSizeChange`                          | Gets the width and height of the content, after mount and after each change.                                                                                                            |

The scroll ends at the browser's `scrollend` event. A browser without `scrollend` ends it 150 ms after the last scroll event.

`scrollEventThrottle` isn't needed: the browser already sends one scroll event per frame.

## Props

| Prop                                                             | On the web                                                                                                                                            |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `horizontal`                                                     | Scrolls on the x axis.                                                                                                                                |
| `contentContainerStyle`                                          | The style of the content `View`.                                                                                                                      |
| `scrollEnabled`                                                  | `false` hides the overflow, so nothing scrolls.                                                                                                       |
| `contentOffset`                                                  | Sets the scroll position on mount, and again when it changes.                                                                                         |
| `centerContent`                                                  | Centers content that is smaller than the box.                                                                                                         |
| `snapToInterval`, `snapToOffsets`, `pagingEnabled`               | Snap after the scroll settles, with a smooth scroll. The scroll is instant when the user asks for reduced motion.                                     |
| `snapToAlignment`, `snapToStart`, `snapToEnd`                    | As on native. `snapToStart` and `snapToEnd` apply to `snapToOffsets`.                                                                                 |
| `showsVerticalScrollIndicator`, `showsHorizontalScrollIndicator` | `false` on the scroll axis hides the scrollbar.                                                                                                       |
| `stickyHeaderIndices`                                            | Those children stick to the top. Vertical only, as on native.                                                                                         |
| `stickyHeaderHiddenOnScroll`                                     | The sticky header slides out on a scroll down and comes back on a scroll up.                                                                          |
| `invertStickyHeaders`                                            | The headers stick to the bottom.                                                                                                                      |
| `keyboardDismissMode`                                            | `on-drag` blurs the focused field when a drag starts. `interactive` has no web effect.                                                                |
| `refreshControl`                                                 | Wraps the scroller and owns the pull. It gets the style props that place the box, and the scroller fills it. See [`RefreshControl`](/refreshcontrol). |
| View props                                                       | As on [`View`](/view).                                                                                                                                |

These native-only props are accepted and ignored: `bounces`, `alwaysBounceHorizontal`, `alwaysBounceVertical`, `contentInset`, `contentInsetAdjustmentBehavior`, `decelerationRate`, `directionalLockEnabled`, `disableIntervalMomentum`, `indicatorStyle`, `keyboardShouldPersistTaps`, `maintainVisibleContentPosition`, `nestedScrollEnabled`, `overScrollMode`, `scrollsToTop`, the zoom props, and the other iOS and Android props.

## Ref

The ref is the scroll element with the React Native methods added, and the measure methods of [`View`](/view#ref):

| Method                                                                | On the web                                                                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `scrollTo({ x, y, animated })`                                        | As on native. `animated` defaults to `true`. The DOM forms `scrollTo(x, y)` and `scrollTo({ left, top })` work too. |
| `scrollToEnd({ animated })`                                           | Scrolls to the end of the content.                                                                                  |
| `getScrollableNode()`, `getNativeScrollRef()`, `getScrollResponder()` | The scroll element.                                                                                                 |
| `getInnerViewNode()`                                                  | The content element.                                                                                                |
| `flashScrollIndicators()`                                             | Does nothing. The browser has no API for it.                                                                        |

The old positional form `scrollTo(y, x)` doesn't work, because the DOM `scrollTo(x, y)` takes the same arguments in the other order.

---
id: accessibilityinfo
title: AccessibilityInfo
description: Accessibility settings from CSS media queries, screen reader announcements through a live region, and focus on the web.
---

# `AccessibilityInfo`

Reads the accessibility settings of the user, announces text to screen readers, and moves focus.

```tsx
import { AccessibilityInfo } from 'react-native'

AccessibilityInfo.announceForAccessibility('Message sent')
```

## Settings

The browser shows some settings to a page through CSS media queries. Those are live: each `is…Enabled()` reads the current value, and each change event fires when the user changes the setting.

| Method                                                                                                      | On the web                                                                                |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `isReduceMotionEnabled()`                                                                                   | `prefers-reduced-motion: reduce`. Event: `reduceMotionChanged`.                           |
| `isReduceTransparencyEnabled()`                                                                             | `prefers-reduced-transparency: reduce`. Event: `reduceTransparencyChanged`.               |
| `isInvertColorsEnabled()`                                                                                   | `inverted-colors: inverted`. Event: `invertColorsChanged`.                                |
| `isHighTextContrastEnabled()`, `isDarkerSystemColorsEnabled()`                                              | `prefers-contrast: more`. Events: `highTextContrastChanged`, `darkerSystemColorsChanged`. |
| `prefersCrossFadeTransitions()`                                                                             | `prefers-reduced-motion: reduce`.                                                         |
| `isScreenReaderEnabled()`, `isAccessibilityServiceEnabled()`, `isBoldTextEnabled()`, `isGrayscaleEnabled()` | `false`. A browser doesn't tell a page about these. Their events never fire.              |
| `getRecommendedTimeoutMillis(timeout)`                                                                      | Returns `timeout` unchanged.                                                              |

Don't build a feature only for screen reader users on `isScreenReaderEnabled()`. On the web it's always `false`.

`addEventListener(eventName, handler)` returns `{ remove() }`, as on native.

## Announcements

| Method                                                        | On the web                                                                                                         |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `announceForAccessibility(text)`                              | Writes the text to a hidden `aria-live="polite"` region, so a screen reader reads it when it's idle.               |
| `announceForAccessibilityWithOptions(text, { queue: false })` | Uses `aria-live="assertive"`, so a screen reader reads it at once.                                                 |
| `addEventListener('announcementFinished', handler)`           | Fires on the next frame, with `{ announcement, success: true }`. The browser doesn't report when the reading ends. |

All announcements share one live region. The same text twice in a row is read twice.

## Focus

| Method                                     | On the web                                             |
| ------------------------------------------ | ------------------------------------------------------ |
| `setAccessibilityFocus(element)`           | Moves keyboard and screen reader focus to the element. |
| `sendAccessibilityEvent(element, 'focus')` | The same. Other event types do nothing.                |

Pass the element itself, for example the ref of a `View`. A node handle number does nothing on the web. The element must be able to take focus: give a `View` `tabIndex={-1}` so that it can, without joining the tab order.

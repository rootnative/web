---
id: pixelratio
title: PixelRatio
description: The device pixel ratio and font scale on the web, and the rounding helpers.
---

# `PixelRatio`

The pixel density of the screen and the font scale of the user.

| Member                                       | On the web                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| `PixelRatio.get()`                           | `devicePixelRatio`. A browser zoom changes it.                                 |
| `PixelRatio.getFontScale()`                  | The root font size divided by 16, the user's font-size setting in the browser. |
| `PixelRatio.getPixelSizeForLayoutSize(size)` | `size` times the ratio, rounded to a whole device pixel.                       |
| `PixelRatio.roundToNearestPixel(size)`       | `size` rounded to the nearest device pixel.                                    |
| `PixelRatio.startDetecting()`                | Does nothing. The browser reports the ratio by itself.                         |

On the server, `get()` and `getFontScale()` return `1`.

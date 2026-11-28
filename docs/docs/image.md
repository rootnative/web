---
id: image
title: Image
description: Shows an image in a sized box, with resizeMode, srcset from a source list, request headers, a tint color, and the Image statics.
---

# `Image`

Shows an image. It renders a box (a `<div>`) with an `<img>` inside. The style sizes the box, and `resizeMode` fits the image in it.

```tsx
import { Image } from 'react-native'

export function Avatar({ url }) {
  return (
    <Image
      source={{ uri: url }}
      style={{ width: 48, height: 48, borderRadius: 24 }}
      accessibilityLabel="Profile photo"
    />
  )
}
```

With no size in the style and no `width` and `height` in the source, the image is 0 × 0, as on native. The box clips the image to its border radius.

## Sources

| `source`                             | On the web                                                                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `{ uri }`                            | The `src` of the `<img>`. A `width` and `height` in the source size the box when the style doesn't.                                 |
| An array with `scale` on each entry  | A `srcset` with `x` descriptors. The browser picks the entry for the pixel density of the screen.                                   |
| An array with `width` on each entry  | A `srcset` with `w` descriptors. `sizes` is the style width, or `100vw` when the style has none. The browser picks by layout width. |
| An array with mixed entries          | The first entry, as on Android.                                                                                                     |
| `{ uri, headers }`, `method`, `body` | A `fetch` with the headers, the method, and the body. The `<img>` shows the result.                                                 |
| A string                             | **Web only.** A URL, for example the one that your bundler gives for an imported image file.                                        |
| A number                             | A Metro asset id from `require('./image.png')`. See [Local images](#local-images).                                                  |

The `src` and `srcSet` props work too, as on native.

## Local images

With Metro, `require('./logo.png')` gives a number, as on native. Metro registers the image, and `Image` loads it from the URL that Metro gives:

- A `srcset` lists the `@2x` and `@3x` files of the image, so the browser loads the file for the pixel density of the screen.
- The box takes the size of the image when the style has none, as on native.
- On the dev server, the URL asks for the `.web.png` file of the image when the image has one.

Vite gives no number for `require`. An id that Metro didn't register loads nothing, and the image warns once. With Vite, import the image and pass the URL:

```tsx
import { Image } from 'react-native'

import logo from './logo.png'

export function Logo() {
  return <Image source={logo} style={{ width: 120, height: 40 }} />
}
```

## Props

| Prop                                                                                    | On the web                                                                                                               |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `resizeMode`                                                                            | `cover` (the default), `contain`, `stretch`, `center`, and `repeat`. `resizeMode` and `objectFit` in the style work too. |
| `tintColor`                                                                             | Paints the color through the shape of the image. The box then carries `role="img"` and the label.                        |
| `blurRadius`                                                                            | A CSS blur.                                                                                                              |
| `defaultSource`                                                                         | Shows until the source loads. It takes a URL, `{ uri }`, or a Metro asset id.                                            |
| `alt`, `accessibilityLabel`                                                             | The text alternative of the image.                                                                                       |
| `onLoadStart`, `onLoad`, `onLoadEnd`, `onError`                                         | As on native. `onLoad` gets `nativeEvent.source` with the `uri`, `width`, and `height`.                                  |
| `onProgress`                                                                            | Never fires. The browser doesn't report progress for an image.                                                           |
| `crossOrigin`, `referrerPolicy`                                                         | Pass to the `<img>`.                                                                                                     |
| `width`, `height`                                                                       | Size the box when the style doesn't.                                                                                     |
| `loading`, `fetchPriority`, `decoding`                                                  | **Web only.** The loading hints of the `<img>`.                                                                          |
| `onLayout`, accessibility props, `nativeID`, `testID`                                   | As on [`View`](/view).                                                                                                   |
| `resizeMethod`, `fadeDuration`, `progressiveRenderingEnabled`, `loadingIndicatorSource` | Native only. Accepted and ignored.                                                                                       |

With `resizeMode="repeat"` or a `tintColor`, the box paints the image as a CSS background or mask. The `<img>` stays in the box, hidden, so that the load events still fire.

An image that fails to load leaves the box empty, as on native. The `<img>` hides, so the browser doesn't draw its broken-image icon or the `alt` text, and the box carries `role="img"` and the label. A new `source` shows the image again. The same applies while a source with `headers` loads. In server HTML, a failed image shows the browser's icon until the page hydrates.

## Statics

| Method                                   | On the web                                                                                                                                               |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Image.getSize(uri)`                     | Loads the image and gives its size. It returns a promise, or calls the success and failure callbacks.                                                    |
| `Image.getSizeWithHeaders(uri, headers)` | The same, with a `fetch` that sends the headers.                                                                                                         |
| `Image.prefetch(url)`                    | Loads the image into the browser cache. Resolves `true`.                                                                                                 |
| `Image.queryCache(urls)`                 | Resolves `{}`. The browser doesn't show its cache to a page.                                                                                             |
| `Image.resolveAssetSource(source)`       | `{ uri, width, height, scale }` of the source. For a Metro asset id, the file for the screen, as on native. `null` for an id that Metro didn't register. |

`getSize` needs a browser. On the server it rejects.

## Ref

The ref is the box element. It has the measure methods of [`View`](/view#ref). The type is `ImageInstance`.

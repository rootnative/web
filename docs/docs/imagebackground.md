---
id: imagebackground
title: ImageBackground
description: ImageBackground on the web. A view with an image that fills it, under its children.
---

# `ImageBackground`

A view with an image that fills it, under its children. It works as in React Native: a [`View`](/view) with an [`Image`](/image) as its first child, absolutely positioned.

```tsx
import { ImageBackground, Text } from 'react-native'

export function Hero() {
  return (
    <ImageBackground
      source={{ uri: 'https://example.com/mountains.jpg' }}
      resizeMode="cover"
      style={{ height: 240, justifyContent: 'flex-end', padding: 16 }}
      imageStyle={{ borderRadius: 12 }}
    >
      <Text style={{ color: 'white', fontSize: 24 }}>The Alps</Text>
    </ImageBackground>
  )
}
```

## Props

| Prop         | Behavior                                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------------------- |
| `style`      | The style of the view. Its `width` and `height` also size the image.                                            |
| `imageStyle` | The style of the image. It comes after the size from `style`, so a `width` or a `height` here wins.             |
| `imageRef`   | A ref to the image element.                                                                                     |
| `ref`        | A ref to the view element.                                                                                      |
| `children`   | Render after the image, so they paint on top of it.                                                             |
| Each other   | Goes to the image, as on native: `source`, `resizeMode`, `alt`, `onLoad`, `onError`, and the rest. See `Image`. |

`importantForAccessibility` goes to both the view and the image, as on native.

A view sized with `flex: 1` and no `width` or `height` still shows the whole image, as on native: the image fills the view.

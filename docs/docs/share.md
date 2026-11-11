---
id: share
title: Share
description: Share on the web. It opens the browser's share sheet with the title, the message, and the URL.
---

# `Share`

Opens the share sheet of the browser, so the user can send a link or a text to another app.

```tsx
import { Button, Share } from 'react-native'

export function ShareTrip({ url }: { url: string }) {
  const onPress = () => {
    Share.share({ title: 'Our trip', message: 'See the plan', url }).catch(() => {
      // This browser has no share sheet. Offer a copy of the link instead.
    })
  }
  return <Button title="Share" onPress={onPress} />
}
```

## API

| Member                                        | On the web                                                                                                                                                                                                      |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Share.share(content, options)`               | Opens the share sheet with `content.title`, `content.message` as the text, and `content.url`. Resolves `{ action: 'sharedAction', activityType: null }`, or `'dismissedAction'` when the user closes the sheet. |
| `Share.sharedAction`, `Share.dismissedAction` | The two action names.                                                                                                                                                                                           |

`content` needs a `message` or a `url`. Bad arguments throw at once, as on native. The `options` (`dialogTitle`, `subject`, `excludedActivityTypes`, `tintColor`, `anchor`) have no effect on the web.

## When it rejects

- The browser has no share sheet, for example Firefox on a desktop, or the page is on plain `http` and not on `localhost`. The error is `Unsupported platform`, React Native's error for a platform with no share sheet.
- The call didn't come from a click or a key press. Call `Share.share` from a press handler.

## Differences from native

- The web shares the `url` too. React Native on Android shares only the `message`.
- `activityType` is always `null`. The browser doesn't tell which app the user picked.

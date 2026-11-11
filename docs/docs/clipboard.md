---
id: clipboard
title: Clipboard
description: Clipboard on the web, through the async Clipboard API. Deprecated in React Native, so the first call logs a warning.
---

# `Clipboard`

Reads and writes text on the clipboard.

`Clipboard` is deprecated in React Native, which will remove it in a future release. It works on the web for now, and the first call logs a warning in development.

```tsx
import { Button, Clipboard } from 'react-native'

export function CopyLink({ url }: { url: string }) {
  return <Button title="Copy link" onPress={() => Clipboard.setString(url)} />
}
```

## API

| Member                      | On the web                                                                                                                                                                                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Clipboard.setString(text)` | Writes `text` with the async Clipboard API. On a page with no Clipboard API, for example plain `http` on a phone on your dev server, it copies through a hidden text field. When the browser refuses, a warning shows in the console in development. |
| `Clipboard.getString()`     | Reads the text with the async Clipboard API. The browser can ask the user first. Rejects when the browser refuses: the user says no, or the page isn't on `https` or `localhost`.                                                                    |

Call both from a press handler. Browsers give access to the clipboard only after a click or a key press, and Safari only during it.

`getString()` rejects on a refusal and doesn't resolve an empty string, so a refusal doesn't look like an empty clipboard.

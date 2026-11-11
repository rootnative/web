---
id: linking
title: Linking
description: Linking on the web. A URL of your site opens in this tab, a URL of another site in a new tab, and mailto and tel URLs go to the system.
---

# `Linking`

Opens a URL, and tells you the URL that the page loaded with.

```tsx
import { Linking } from 'react-native'

export function openDocs() {
  Linking.openURL('https://reactnative.dev/docs/linking').catch((error) => {
    console.warn(error.message)
  })
}
```

For a link that the user clicks, prefer `href` on a `Text` or a `View`. It renders a real `<a>`, so the user can open it in a new tab, and search engines follow it. See [Semantic HTML](/semantic-html).

## Where `openURL` opens a URL

| URL                                          | On the web                                                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| A URL of your site, for example `/profile`   | Opens in this tab. A relative URL resolves against the URL of the page.                                  |
| A URL of another site                        | Opens in a new tab. The new page can't reach yours through `window.opener`.                              |
| `mailto:`, `tel:`, `sms:`, and other schemes | Go to the system from this tab, so the mail, phone, or other app opens.                                  |
| `javascript:` and `data:`                    | Rejects. A `javascript:` URL runs code in your page, and browsers block a page that opens a `data:` URL. |

Browsers block a new tab that a page opens with no click or key press. Call `openURL` from a press handler. When the browser blocks the tab, the promise rejects.

## API

| Member                                                       | On the web                                                                                                                                                      |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Linking.openURL(url)`                                       | Opens `url` as the table above shows. Throws at once when `url` isn't a string or is empty, as on native.                                                       |
| `Linking.canOpenURL(url)`                                    | `true` for each URL that `openURL` tries, `false` for a URL that it rejects. The browser can't tell if an app handles a custom scheme, so `myapp://` is `true`. |
| `Linking.getInitialURL()`                                    | The URL that the page loaded with. It stays the same when your router changes the URL. `null` on the server.                                                    |
| `Linking.addEventListener('url', fn)`                        | Registers `fn` and returns `{ remove() }`. The browser never calls it. See [The `url` event](#the-url-event).                                                   |
| `addListener`, `emit`, `removeAllListeners`, `listenerCount` | Work as on native. `Linking.emit('url', { url })` calls the `url` listeners.                                                                                    |
| `Linking.openSettings()`                                     | Rejects. The web has no settings page for an app.                                                                                                               |
| `Linking.sendIntent(action, extras)`                         | Rejects with `Unsupported`, as on iOS.                                                                                                                          |

## The `url` event

On native, `url` fires when a link opens the app while it runs. On the web, the URL of the page changes through your router: a link, back, or forward. So the browser never fires `url`, and your router handles the change, as with [`BackHandler`](/backhandler).

On the web, a deep link opens the page, so `getInitialURL()` returns it.

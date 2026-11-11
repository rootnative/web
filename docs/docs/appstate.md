---
id: appstate
title: AppState
description: AppState on the web. The app is active while its page is visible, and in the background while the page is hidden or unloads.
---

# `AppState`

Tells you if the user can see the app, and calls you when that changes. On the web, the app is `active` while its page is visible. It's in the `background` while the page is hidden: another tab, a minimized window, a locked phone, or a page that unloads.

```tsx
import { useEffect } from 'react'
import { AppState } from 'react-native'

export function useRefreshOnReturn(refresh: () => void) {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh()
    })
    return () => subscription.remove()
  }, [refresh])
}
```

## API

| Member                                           | On the web                                                                                                                             |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `AppState.currentState`                          | `'active'` while the page is visible, else `'background'`. It's always current, also with no listener.                                 |
| `AppState.isAvailable`                           | `true`.                                                                                                                                |
| `AppState.addEventListener('change', fn)`        | Calls `fn` with the new state when the page is hidden or shown, and with `'background'` when the page unloads. Returns `{ remove() }`. |
| `AppState.addEventListener('blur', fn)`          | Calls `fn` when the browser window loses the focus, as on Android. The page can still be visible.                                      |
| `AppState.addEventListener('focus', fn)`         | Calls `fn` when the browser window gets the focus back.                                                                                |
| `AppState.addEventListener('memoryWarning', fn)` | Registers `fn`. It never runs: the browser has no memory warning.                                                                      |

An unknown event name throws, as on native.

## Differences from native

- There's no `'inactive'` state, as on Android. A focus change of the window, for example a click on the address bar, fires `blur` and `focus`, and the state stays `'active'`.
- Save the user's work when the state goes to `'background'`. A browser can close a hidden tab with no other event.

## On the server

`currentState` is `'active'` on the server, and no event fires there. In a tab that opens in the background, the browser value is `'background'`, so don't read `currentState` in render.

---
id: backhandler
title: BackHandler
description: BackHandler on the web. Handlers register and remove, but never fire, because the browser has no hardware back button.
---

# `BackHandler`

The browser has no hardware back button, and the history of the page belongs to your router. So on the web, back handlers register and remove as on native, but never fire.

| Member                                                     | On the web                                                  |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| `BackHandler.addEventListener('hardwareBackPress', fn)`    | Registers `fn` and returns `{ remove() }`. `fn` never runs. |
| `BackHandler.removeEventListener('hardwareBackPress', fn)` | Removes `fn`.                                               |
| `BackHandler.exitApp()`                                    | Does nothing. A page can't close a tab that it didn't open. |

To act on the browser's back button, use the history API of your router.

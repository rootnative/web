---
id: introduction
title: Introduction
description: A standalone web runtime for React Native apps. You write react-native, and it runs in the browser as a real web app.
---

# Root Native Web

`@rootnative/web` is a standalone web runtime for React Native apps. You write `react-native`. It runs in the browser as a real web app.

## Why

[react-native-web](https://github.com/necolas/react-native-web) tracks React Native and stops there. This project starts from the browser and asks a different question: what does a React Native app need to be a good web app?

- **Parity first.** Every `react-native` export that ships behaves as it does on iOS and Android.
- **Web second, behind the same API.** Semantic HTML, SEO, server rendering, DOM events, logical CSS properties, and the browser features that native doesn't have.
- **Modern only.** TypeScript, ESM, React 19. No Flow, no CommonJS, no `findDOMNode`, no `forwardRef`.

## How it works

Your app imports `react-native`. In an Expo app, [`@rootnative/web-expo`](/expo) resolves that name to `@rootnative/web` on Metro, in place of react-native-web. In a Vite app, the [Vite plugin](/vite-plugin) does it. Your app code uses three layers:

| Layer  | Import                | What's in it                                                                                                |
| ------ | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| Parity | `@rootnative/web`     | The React Native components and APIs                                                                        |
| Web    | `@rootnative/web/dom` | Browser features that native doesn't have, for example `<Head>`                                             |
| Server | `react-dom/server`    | React's own renderer. Each component sends its CSS with its HTML. See [Server rendering](/server-rendering) |

Import `@rootnative/web/dom` only in code that runs on the web. The rest of your app stays the same code that runs on iOS and Android. One more entry, `@rootnative/web/vite`, is the Vite plugin, for `vite.config.ts` only.

## Next steps

- [Installation](/installation): set up an Expo app or a Vite app.
- [Expo](/expo): the details of the Expo setup, also with Expo Router.
- [Status](/status): what ships today, what's planned, and how it's tested.

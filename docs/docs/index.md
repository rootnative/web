---
id: index
title: Introduction
slug: /
description: A standalone web runtime for React Native apps. You write react-native, and it runs in the browser as a real web app.
---

# Root Native Web

`@rootnative/web` is a standalone web runtime for React Native apps. You write `react-native`. It runs in the browser as a real web app.

:::warning Early alpha

The API can still change between releases. Each page lists what ships today and what doesn't.

:::

## Why

[react-native-web](https://github.com/necolas/react-native-web) tracks React Native and stops there. This project starts from the browser and asks a different question: what does a React Native app need to be a good web app?

- **Parity first.** Every `react-native` export that ships behaves as it does on iOS and Android.
- **Web second, behind the same API.** Semantic HTML, SEO, server rendering, DOM events, logical CSS properties, and the browser features that native doesn't have.
- **Modern only.** TypeScript, ESM, React 19. No Flow, no CommonJS, no `findDOMNode`, no `forwardRef`.

## How it works

Your app imports `react-native`. A bundler alias maps that name to `@rootnative/web`. The package has three entry points:

| Layer  | Import                   | What's in it                                                    |
| ------ | ------------------------ | --------------------------------------------------------------- |
| Parity | `@rootnative/web`        | The React Native components and APIs                            |
| Web    | `@rootnative/web/dom`    | Browser features that native doesn't have, for example `<Head>` |
| Server | `@rootnative/web/server` | Server rendering helpers                                        |

Import `@rootnative/web/dom` and `@rootnative/web/server` only in code that runs on the web. The rest of your app stays the same code that runs on iOS and Android.

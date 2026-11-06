# @rootnative/web

A standalone web runtime for React Native apps. You write `react-native`. It runs in the browser as a real web app.

> Status: planning. Nothing is published yet.

## What it is

- **Parity layer.** Every `react-native` export, with the same behavior as iOS and Android.
- **Web layer** (`@rootnative/web/dom`). What a browser can do that native cannot: DOM events, semantic HTML and SEO, SSR, URL and history, media, drag and drop. Opt-in and typed.

## What it is not

- Not a fork of `react-native-web`, and not compatible with its internals.
- Not tied to Expo or Metro.
- Not for React 18, CommonJS, or Flow.

## License

[MIT](./LICENSE)

---
id: libraries
title: Libraries
description: What a React Native library needs to run on @rootnative/web: the worklets option for Reanimated, the font of an icon set, and the TypeScript setting for library types.
---

# Libraries

A React Native library runs here when it has a web build, or when it's plain React Native code. The [Vite plugin](/vite-plugin) resolves `react-native` inside the library too, and loads its `.web.js` files. Some libraries need one more step.

| Library                                        | What it needs                                          |
| ---------------------------------------------- | ------------------------------------------------------ |
| `react-native-reanimated`, and libraries on it | The [`worklets` option](#reanimated) of the plugin.    |
| `@react-native-vector-icons/*`                 | The [font of the icon set](#icon-fonts) from your app. |
| `react-native-svg`                             | Nothing.                                               |
| `react-native-safe-area-context`               | Nothing.                                               |
| `@react-native-async-storage/async-storage`    | Nothing.                                               |

A library with only native code, and no web build, doesn't run in a browser.

## Reanimated

Reanimated needs the Babel plugin of `react-native-worklets`. Set the option of the Vite plugin:

```ts title="vite.config.ts"
export default defineConfig({
  plugins: [react(), rootnative({ worklets: true })],
})
```

A library built on Reanimated needs the same option. See [`worklets`](/vite-plugin#worklets).

## Icon fonts

An icon set of `@react-native-vector-icons` renders each icon as a character of its font. The package loads the font file only through Expo. In an app with no Expo, give the browser the font yourself, or each icon is an empty box.

Add the font once, in the file that mounts your app:

```ts title="src/main.tsx"
import fontUrl from '@react-native-vector-icons/material-design-icons/fonts/MaterialDesignIcons.ttf?url'

const iconFont = new FontFace('MaterialDesignIcons', `url(${fontUrl})`)
document.fonts.add(iconFont)
void iconFont.load()
```

The family name must be the name that the icon set uses for its font. For Material Design Icons that's `MaterialDesignIcons`. For another set, read the `postScriptName` in the entry file of its package. The font file is in the `fonts` folder of the package.

TypeScript needs the types of Vite for the `?url` import. Add `"types": ["vite/client"]` to the `compilerOptions` of your `tsconfig.json`.

## Types of a library

The type files of a native library import types from the real `react-native` package. Its global types don't fit a browser program, so a type check of those files reports errors such as `Duplicate identifier 'FormData'`.

Let TypeScript skip the type files of your dependencies:

```json title="tsconfig.json"
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

Your own code is still checked in full.

A library can add a prop to a component with `declare module 'react-native'`. The props types here are interfaces, as in React Native, so the new prop merges with them.

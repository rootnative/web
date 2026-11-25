---
id: from-react-native-web
title: From react-native-web
description: Move an app from react-native-web to @rootnative/web. The changes you make, the workarounds you can remove, and the behavior that changes.
---

# From react-native-web

Your app code stays the same when you move from react-native-web. But react-native-web leaves out some behavior of React Native, so an app often has web-only code for these gaps. This page lists:

- The changes that you make.
- The workarounds that you can remove.
- The behavior that changes with no change in your code.

To install, see [Installation](/installation) for Vite, or [Expo](/expo). This page compares with react-native-web 0.21.

## Changes you make

| Your app uses                                                                       | Change                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flat accessibility props, such as `accessibilityDisabled`                           | Use the `aria-*` prop, such as `aria-disabled`. React Native doesn't have the flat props, so this package drops them. In development, a warning names the prop to use. See [Props from react-native-web](/compat#props-from-react-native-web). |
| `CheckBox`, `Picker`, `ProgressBar`, or another name that only react-native-web has | Use a library or your own component. These names aren't React Native APIs, so `@rootnative/web` doesn't export them. Under Expo, they load as stubs that throw on use: see [Names that load as stubs](/expo#names-that-load-as-stubs).         |
| `@expo/html-elements`                                                               | Give `View` and `Text` a `role`. See [Semantic HTML](/semantic-html). The library imports internal files of react-native-web, so the bundle fails.                                                                                             |
| Jest with the `jest-expo/web` preset                                                | Map `react-native` to `@rootnative/web-expo`. See [Tests](/expo#tests).                                                                                                                                                                        |

## Workarounds you can remove

In each row, react-native-web leaves out the behavior, and `@rootnative/web` has it. So web-only code that stands in for the behavior isn't necessary.

| Behavior                                                                                   | react-native-web                                         | `@rootnative/web`                                                                                                                                                           | Remove                                                                                                                                  |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Space on a focused `Pressable` that isn't `role="button"`                                  | Doesn't press. Only Enter presses.                       | Presses, as Enter does.                                                                                                                                                     | An `onKeyDown` that presses on Space. If it calls `preventDefault()`, it does no harm. Else each Space press calls `onPress` two times. |
| `Alert.alert`                                                                              | Does nothing.                                            | Shows a dialog with the title, the message, and the buttons. See [Alert](/alert).                                                                                           | A `window.alert` or a `window.confirm` that stands in for it.                                                                           |
| `Keyboard` events and `KeyboardAvoidingView`                                               | No event fires, and `KeyboardAvoidingView` doesn't move. | `keyboardDidShow` and `keyboardDidHide` fire for the on-screen keyboard of a phone or a tablet, and `KeyboardAvoidingView` moves out of its way. See [Keyboard](/keyboard). | Web-only code that reads the height of the keyboard, for example from `window.visualViewport`.                                          |
| `onScrollBeginDrag`, `onScrollEndDrag`, `onMomentumScrollBegin`, and `onMomentumScrollEnd` | Never fire.                                              | Fire. See [ScrollView](/scrollview).                                                                                                                                        | Touch events or timers that stand in for them.                                                                                          |

## Behavior that changes

These rows change what your app does, with no change in your code.

| Behavior                                               | react-native-web                                    | `@rootnative/web`                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------ | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AccessibilityInfo.isScreenReaderEnabled()`            | Resolves `true`.                                    | Resolves `false`, because a browser doesn't tell a page. A feature that shows only for screen reader users doesn't show on the web. See [AccessibilityInfo](/accessibilityinfo).                                                                                                                                                                                                                         |
| `RefreshControl`                                       | Renders a plain view. A pull does nothing.          | A pull with a finger calls `onRefresh`. A mouse, a pen, or a keyboard has no pull, so keep a refresh button. See [RefreshControl](/refreshcontrol).                                                                                                                                                                                                                                                      |
| A tap outside a focused `TextInput`                    | The browser moves the focus, so the keyboard hides. | The keyboard stays, as on native. Inside a `ScrollView`, `keyboardShouldPersistTaps` decides. See [A tap outside the field](/textinput#a-tap-outside-the-field).                                                                                                                                                                                                                                         |
| `snapToInterval` and `snapToOffsets` of a `ScrollView` | Ignored. Only `pagingEnabled` snaps.                | All three snap after the scroll settles. So a fling can stop and then scroll back to a snap point. A quick spin of the mouse wheel can end where it started. If your app has a CSS snap (`scrollSnapType` and `scrollSnapAlign`) for these props, keep it. With it, the browser stops the scroll on a snap point. Give it the same snap points as the props. Else the list moves again after the scroll. |

Libraries written for react-native-web send some props and import some exports that React Native doesn't have, such as `hrefAttrs`, `dataSet`, and `unstable_createElement`. See [Compat exports](/compat) for what this package does with them.

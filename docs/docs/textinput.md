---
id: textinput
title: TextInput
description: A text field. It renders an input or a growing textarea, with the React Native events, Enter behavior, keyboard hints, and autofill.
---

# `TextInput`

A text field. It renders an `<input type="text">`, or a `<textarea>` with `multiline`.

```tsx
import { useState } from 'react'
import { TextInput } from 'react-native'

export function EmailField() {
  const [email, setEmail] = useState('')
  return (
    <TextInput
      value={email}
      onChangeText={setEmail}
      placeholder="you@example.com"
      keyboardType="email-address"
      autoComplete="email"
      autoCapitalize="none"
    />
  )
}
```

The field has no border, no padding, and no background, as on iOS. Its text direction follows the text you type.

## Multiline

With `multiline`, the field grows with its text. `numberOfLines` is the minimum number of rows. A `height` in the style fixes the size.

## Enter

| Field       | Enter does                                                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single-line | Calls `onSubmitEditing`, then blurs the field. The browser's default stays, so a field inside a `<form>` submits the form.                         |
| Multiline   | Adds a new line. With `submitBehavior` set to `submit` or `blurAndSubmit`, it calls `onSubmitEditing` instead. Shift+Enter always adds a new line. |

`submitBehavior` and `blurOnSubmit` work as on native.

## Props

| Prop                                                                                        | On the web                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`, `defaultValue`, `onChangeText`, `onChange`                                         | As on native. A `value` with no handler stays fixed, with no React warning.                                                                                                                           |
| `placeholder`, `maxLength`, `autoFocus`                                                     | As on native.                                                                                                                                                                                         |
| `secureTextEntry`                                                                           | `type="password"`.                                                                                                                                                                                    |
| `keyboardType`                                                                              | Becomes `inputmode`, so a phone shows the matching keyboard. The input `type` stays `text`, so the browser adds no validation.                                                                        |
| `returnKeyType`                                                                             | Becomes `enterkeyhint`, the label of the Enter key on a phone keyboard.                                                                                                                               |
| `inputMode`, `enterKeyHint`                                                                 | Win over `keyboardType` and `returnKeyType` when you set them.                                                                                                                                        |
| `showSoftInputOnFocus`                                                                      | `false` is `inputmode="none"`, so a phone shows no keyboard.                                                                                                                                          |
| `autoComplete`, `textContentType`                                                           | The HTML `autocomplete` tokens. The React Native-only values map, for example `name-given` to `given-name` and `sms-otp` to `one-time-code`. `textContentType` applies when `autoComplete` isn't set. |
| `autoCapitalize`, `autoCorrect`, `spellCheck`                                               | The matching HTML attributes.                                                                                                                                                                         |
| `editable`, `readOnly`                                                                      | `editable={false}` is `readonly`, not `disabled`, so the field stays focusable and its text selectable.                                                                                               |
| `placeholderTextColor`                                                                      | The color of the placeholder.                                                                                                                                                                         |
| `selectionColor`, `cursorColor`, `caretHidden`                                              | The background of selected text and the color of the caret. `caretHidden` makes the caret transparent.                                                                                                |
| `selection`, `onSelectionChange`                                                            | As on native. `onSelectionChange` also fires when the caret moves.                                                                                                                                    |
| `selectTextOnFocus`, `clearTextOnFocus`, `contextMenuHidden`                                | As on native.                                                                                                                                                                                         |
| `textAlign`                                                                                 | As on native.                                                                                                                                                                                         |
| `onFocus`, `onBlur`, `onEndEditing`, `onKeyPress`, `onSubmitEditing`, `onContentSizeChange` | `nativeEvent` is the DOM event, with `text`, `eventCount`, `key`, `selection`, or `contentSize` added. `nativeEvent.target` is the element. `onEndEditing` fires on blur.                             |
| `onLayout`, accessibility props, `nativeID`, `testID`                                       | As on [`View`](/view).                                                                                                                                                                                |

These native-only props are accepted and ignored: `clearButtonMode`, `keyboardAppearance`, `textAlignVertical`, `underlineColorAndroid`, `passwordRules`, `dataDetectorTypes`, and the other iOS and Android props.

## Ref

The ref is the `<input>` or `<textarea>` element, with `clear()`, `isFocused()`, `getNativeRef()`, and `setNativeProps({ text, style })` added. It also has the measure methods of [`View`](/view#ref).

`TextInput.State` has `currentlyFocusedInput()`, `focusTextInput(element)`, and `blurTextInput(element)`.

---
id: alert
title: Alert
description: React Native's Alert on a dialog element, with the look of Android's alert. Escape presses the cancel button, and a cancelable alert also closes from outside.
---

# `Alert`

Shows an alert with a title, a message, and buttons. It isn't part of your React tree, so you can call it from any handler.

```tsx
import { Alert, Button } from 'react-native'

export function DeleteNote({ onDelete }: { onDelete: () => void }) {
  return (
    <Button
      title="Delete"
      onPress={() =>
        Alert.alert('Delete the note?', "You can't undo this.", [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: onDelete },
        ])
      }
    />
  )
}
```

The alert is a `<dialog role="alertdialog">` that opens with `showModal()`. Screen readers read the title as its name and the message as its description. The page under the alert is inert and doesn't scroll.

## Buttons

- The buttons show in your order, at the end of the alert. With three, the first sits at the start, as the neutral button does on Android.
- Without buttons, or with an empty list, the alert has an OK button. A last button without text says OK.
- A press closes the alert, then calls the button's `onPress`. So `onPress` can open the next alert.
- `style: 'destructive'` makes the text red, as on iOS.
- The focus goes to the button with `isPreferred`, else the `cancel` button, else the first button. Enter presses it. When the alert closes, the focus goes back.
- Android shows at most three buttons. The web shows them all, as iOS does.

## Close with no button

- Escape presses the button with `style: 'cancel'`, as a hardware keyboard does on iOS. So does the back gesture of Chrome on Android.
- Without a cancel button, Escape and a click outside the alert close it only with `cancelable: true`, as on Android. Then `onDismiss` runs.
- Otherwise the alert stays open until you press a button.

## Look

The look of Android's alert: a white card with a shadow over a dim layer, a 20 px title, a 16 px message, and text buttons in teal. In the dark scheme, the card is dark gray. The scheme follows [`Appearance`](/appearance). `userInterfaceStyle: 'light'` or `'dark'` sets it for one alert.

A new alert goes on top of the alert before it. Each one closes on its own.

## Options

| Option               | On the web                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| `cancelable`         | Escape, the back gesture, and a click outside close the alert. The default is `false`, as on Android. |
| `onDismiss`          | Called when a cancelable alert closes with no button.                                                 |
| `userInterfaceStyle` | `'light'` or `'dark'` for this alert. The default follows `Appearance`.                               |

## `Alert.prompt`

On native, `Alert.prompt` is iOS only, and Android does nothing. On the web it does nothing yet, and it logs a warning in development.

## Older browsers and the server

Firefox before 98 and Safari before 15.4 have no `showModal()`. There the alert is a box on top with no dim layer, and Escape still works. The page under it isn't inert.

On the server, `Alert.alert` does nothing.

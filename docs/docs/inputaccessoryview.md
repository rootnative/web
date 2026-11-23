---
id: inputaccessoryview
title: InputAccessoryView
description: InputAccessoryView on the web. It renders nothing, as on Android.
---

# `InputAccessoryView`

On iOS, a view that shows above the keyboard of a text field. React Native has it on iOS only. On the web, as on Android, it renders nothing, and in development the first render warns once: `<InputAccessoryView> is only supported on iOS.`

The import works, so code for iOS that renders it still runs on the web. For a bar above the keyboard on the web, put a view at the bottom of a [`KeyboardAvoidingView`](/keyboardavoidingview).

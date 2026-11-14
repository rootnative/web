// A prop that a library adds to the props of React Native with a module augmentation. The app
// doesn't render this file: the type check of the consumer finds out if the new prop merges into
// the types of the tarball and if the props of the package stay.
import type { ReactElement } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'

declare module 'react-native' {
  interface ViewProps {
    libraryTag?: string
  }
  interface TextProps {
    libraryTag?: string
  }
  interface TextInputProps {
    libraryTag?: string
  }
  interface PressableProps {
    libraryTag?: string
  }
}

export function Augmented(): ReactElement {
  return (
    <View libraryTag="view" testID="view" style={{ flex: 1 }}>
      <Text libraryTag="text" numberOfLines={1} style={{ fontSize: 14 }}>
        Text
      </Text>
      <TextInput libraryTag="input" placeholder="Name" style={{ height: 40 }} />
      <Pressable libraryTag="pressable" onPress={() => {}} style={{ padding: 8 }} />
    </View>
  )
}

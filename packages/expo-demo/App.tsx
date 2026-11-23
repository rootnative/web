import { Motion } from '@rootnative/inertia'
import { useState, type ReactElement } from 'react'
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as SystemUI from 'expo-system-ui'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import logo from './assets/logo.png'
import { Gallery } from './Gallery'

// The home tab of the demo. Expo's bundler rewrites each `react-native` import to a path of
// react-native-web, and `withRootNative` sends that path to `@rootnative/web-expo`.
export default function App(): ReactElement {
  const [count, setCount] = useState(0)
  const [name, setName] = useState('')
  const [moved, setMoved] = useState(false)
  const [pageColor, setPageColor] = useState('No page color yet.')

  // On the web, `getBackgroundColorAsync` loads react-native-web's `normalizeColor`.
  const changePageColor = async (): Promise<void> => {
    await SystemUI.setBackgroundColorAsync('#f8fafc')
    setPageColor(String(await SystemUI.getBackgroundColorAsync()))
  }

  const offset = useSharedValue(0)
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }))
  const move = (): void => {
    offset.set(withTiming(moved ? 0 : 160, { duration: 200 }))
    setMoved(!moved)
  }

  return (
    <ScrollView testID="page" contentContainerStyle={styles.page}>
      <Image testID="logo" source={logo} alt="The logo of Root Native Web" style={styles.logo} />
      <Text role="heading" aria-level={1} style={styles.title}>
        Root Native Web on Expo
      </Text>
      <Text testID="platform">Platform.OS is {Platform.OS}</Text>
      <View style={styles.row}>
        <Pressable testID="add" onPress={() => setCount(count + 1)} style={styles.button}>
          <Text style={styles.buttonLabel}>Add one</Text>
        </Pressable>
        <Text testID="count">{count}</Text>
      </View>
      <TextInput
        testID="name"
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        style={styles.field}
      />
      <Text testID="greeting">{name === '' ? 'No name yet.' : `Hello, ${name}.`}</Text>
      <View style={styles.row}>
        <Pressable
          testID="set-page-color"
          onPress={() => void changePageColor()}
          style={styles.button}
        >
          <Text style={styles.buttonLabel}>Set the page color</Text>
        </Pressable>
        <Text testID="page-color">{pageColor}</Text>
      </View>
      <Pressable testID="move" onPress={move} style={styles.button}>
        <Text style={styles.buttonLabel}>{moved ? 'Move back' : 'Move'}</Text>
      </Pressable>
      <Animated.View testID="reanimated" style={[styles.box, slide]} />
      <Gallery />
      <Motion.View
        testID="inertia"
        animate={{ translateX: moved ? 160 : 0 }}
        transition={{ type: 'timing', duration: 200 }}
        style={styles.box}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 16 },
  logo: { width: 48, height: 48 },
  title: { fontSize: 24, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#e11d48',
  },
  buttonLabel: { color: '#ffffff' },
  box: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#e11d48' },
  field: {
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
  },
})

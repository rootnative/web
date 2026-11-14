import AsyncStorage, { createAsyncStorage } from '@react-native-async-storage/async-storage'
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons'
import fontUrl from '@react-native-vector-icons/material-design-icons/fonts/MaterialDesignIcons.ttf?url'
import { Button } from '@rootnative/components/button'
import { Checkbox } from '@rootnative/components/checkbox'
import { IconButton } from '@rootnative/components/icon-button'
import { mdiResolver } from '@rootnative/components/mdi'
import { ThemeProvider, darkTheme, lightTheme, useThemeMode } from '@rootnative/core'
import { useEffect, useState, type ReactElement } from 'react'
import { StyleSheet, Text, View } from 'react-native'

// The icon set names its font family and loads the file only through Expo. On the web, the app
// gives the browser the font.
const iconFont = new FontFace('MaterialDesignIcons', `url(${fontUrl})`)
document.fonts.add(iconFont)
void iconFont.load()

const database = createAsyncStorage('playground')

// The vector-icons package with the MDI font, and async-storage, each alone and through
// `@rootnative/core` and `@rootnative/components`.
export function IconsStorageRoute(): ReactElement {
  return (
    <ThemeProvider
      theme={{ light: lightTheme, dark: darkTheme }}
      iconResolver={mdiResolver}
      storage={AsyncStorage}
    >
      <Page />
    </ThemeProvider>
  )
}

function Page(): ReactElement {
  const { mode, setMode, isReady } = useThemeMode()
  const [count, setCount] = useState<number | null>(null)
  const [keys, setKeys] = useState<readonly string[]>([])

  useEffect(() => {
    let live = true
    void database.getItem('count').then((value) => {
      if (live) setCount(value === null ? 0 : Number(value))
    })
    return () => {
      live = false
    }
  }, [])

  const add = async (): Promise<void> => {
    const next = (count ?? 0) + 1
    await database.setItem('count', String(next))
    setCount(next)
    setKeys(await database.getAllKeys())
  }

  return (
    <View style={styles.page}>
      <Text style={styles.title}>The icon set</Text>
      <View style={styles.row}>
        <MaterialDesignIcons testID="icon" name="rocket-launch" size={32} color="#2563eb" />
        <MaterialDesignIcons name="heart" size={32} color="#dc2626" />
        <MaterialDesignIcons name="account-circle" size={32} color="#16a34a" />
      </View>

      <Text style={styles.title}>String icon names in the components</Text>
      <View style={styles.row}>
        <Button testID="icon-button" leadingIcon="plus">
          Create
        </Button>
        <IconButton icon="dots-vertical" accessibilityLabel="More" />
        <Checkbox defaultValue />
      </View>

      <Text style={styles.title}>A database of async-storage</Text>
      <View style={styles.row}>
        <Button testID="add" variant="tonal" onPress={() => void add()}>
          Add one
        </Button>
        <Text testID="count">{count === null ? 'reading' : String(count)}</Text>
        <Text testID="keys">{keys.join(', ')}</Text>
      </View>

      <Text style={styles.title}>The theme mode in the default storage</Text>
      <View style={styles.row}>
        <Button
          testID="mode"
          variant="outlined"
          onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')}
        >
          Change the mode
        </Button>
        <Text testID="mode-value">{isReady ? mode : 'reading'}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { gap: 12 },
  title: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
})

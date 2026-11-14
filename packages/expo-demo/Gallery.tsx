import { Button } from '@rootnative/components/button'
import { Checkbox } from '@rootnative/components/checkbox'
import { PortalHost } from '@rootnative/components/portal'
import { CircularProgress } from '@rootnative/components/progress'
import { Slider } from '@rootnative/components/slider'
import { Switch } from '@rootnative/components/switch'
import { TextField } from '@rootnative/components/text-field'
import { ThemeProvider, darkTheme, lightTheme, type IconResolver } from '@rootnative/core'
import { useState, type ReactElement } from 'react'
import { StyleSheet, Text, View } from 'react-native'

// The demo has no icon font, so an icon name is a glyph.
const glyphs: Record<string, string> = { check: '✓', close: '✕', minus: '−' }
const glyphResolver: IconResolver = (name, { size, color }) => (
  <Text style={{ fontSize: size, lineHeight: size, color }}>{glyphs[name] ?? '•'}</Text>
)

// `@rootnative/core` and `@rootnative/components` from npm, as an Expo app uses them.
export function Gallery(): ReactElement {
  const [saves, setSaves] = useState(0)
  const [on, setOn] = useState(false)
  const [checked, setChecked] = useState(false)
  const [volume, setVolume] = useState(30)
  const [email, setEmail] = useState('')

  return (
    <ThemeProvider theme={{ light: lightTheme, dark: darkTheme }} iconResolver={glyphResolver}>
      <PortalHost>
        <View style={styles.gallery}>
          <View style={styles.row}>
            <Button testID="save" onPress={() => setSaves(saves + 1)}>
              Save
            </Button>
            <Text testID="saves">{saves}</Text>
            <Switch testID="switch" value={on} onValueChange={setOn} />
            <Text testID="on">{on ? 'on' : 'off'}</Text>
            <Checkbox testID="checkbox" value={checked} onValueChange={setChecked} />
            <Text testID="checked">{checked ? 'checked' : 'clear'}</Text>
          </View>
          <Slider
            testID="slider"
            value={volume}
            onValueChange={(value) => setVolume(typeof value === 'number' ? value : value[0])}
            minimumValue={0}
            maximumValue={100}
            step={10}
            accessibilityLabel="Volume"
          />
          <Text testID="volume">{volume}</Text>
          <TextField
            testID="email"
            label="Email"
            variant="outlined"
            value={email}
            onChangeText={setEmail}
          />
          <Text testID="typed">{email}</Text>
          <CircularProgress progress={0.4} />
        </View>
      </PortalHost>
    </ThemeProvider>
  )
}

const styles = StyleSheet.create({
  gallery: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
})

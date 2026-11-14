import { BottomSheet } from '@rootnative/components/bottom-sheet'
import { Button } from '@rootnative/components/button'
import { Card } from '@rootnative/components/card'
import { Checkbox } from '@rootnative/components/checkbox'
import { Chip } from '@rootnative/components/chip'
import { Dialog } from '@rootnative/components/dialog'
import { Divider } from '@rootnative/components/divider'
import { List, ListDivider, ListItem } from '@rootnative/components/list'
import { LoadingIndicator } from '@rootnative/components/loading-indicator'
import { Menu } from '@rootnative/components/menu'
import { PortalHost } from '@rootnative/components/portal'
import { CircularProgress, LinearProgress } from '@rootnative/components/progress'
import { Radio } from '@rootnative/components/radio'
import { Slider } from '@rootnative/components/slider'
import { SnackbarProvider, useSnackbar } from '@rootnative/components/snackbar'
import { Switch } from '@rootnative/components/switch'
import { Tabs } from '@rootnative/components/tabs'
import { TextField } from '@rootnative/components/text-field'
import { Tooltip } from '@rootnative/components/tooltip'
import { Typography } from '@rootnative/components/typography'
import {
  ThemeProvider,
  darkTheme,
  lightTheme,
  useTheme,
  useThemeMode,
  type IconResolver,
} from '@rootnative/core'
import { useState, type ReactElement } from 'react'
import { StyleSheet, Text, View } from 'react-native'

// The vector-icons package has its own route later. Until then, a string icon name is a glyph.
const glyphs: Record<string, string> = { check: '✓', close: '✕', minus: '−' }
const glyphResolver: IconResolver = (name, { size, color }) => (
  <Text style={{ fontSize: size, lineHeight: size, color }}>{glyphs[name] ?? '•'}</Text>
)

const tabs = [
  { value: 'flights', label: 'Flights' },
  { value: 'trips', label: 'Trips' },
  { value: 'explore', label: 'Explore' },
]

// `@rootnative/core` and `@rootnative/components` from npm, with the providers an app mounts.
export function ComponentsRoute(): ReactElement {
  return (
    <ThemeProvider theme={{ light: lightTheme, dark: darkTheme }} iconResolver={glyphResolver}>
      <PortalHost>
        <SnackbarProvider>
          <Gallery />
        </SnackbarProvider>
      </PortalHost>
    </ThemeProvider>
  )
}

function Gallery(): ReactElement {
  const { scheme, setMode } = useThemeMode()
  const theme = useTheme()
  const snackbar = useSnackbar()
  const [checked, setChecked] = useState(true)
  const [picked, setPicked] = useState(false)
  const [on, setOn] = useState(false)
  const [filter, setFilter] = useState(false)
  const [email, setEmail] = useState('')
  const [section, setSection] = useState('flights')
  const [volume, setVolume] = useState(30)
  const [dialog, setDialog] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [picks, setPicks] = useState(0)

  return (
    <View style={[styles.page, { backgroundColor: theme.colors.background }]}>
      <Typography variant="headlineSmall" level={2}>
        Components on {scheme}
      </Typography>
      <View style={styles.row}>
        <Button testID="mode" onPress={() => setMode(scheme === 'dark' ? 'light' : 'dark')}>
          Change the mode
        </Button>
        <Button variant="tonal">Tonal</Button>
        <Button variant="outlined">Outlined</Button>
        <Button variant="elevated">Elevated</Button>
        <Button variant="text">Text</Button>
        <Button testID="toggle-button" variant="outlined" defaultSelected={false}>
          Toggle
        </Button>
      </View>

      <Card variant="outlined" style={styles.card}>
        <Card.Content>
          <Typography variant="titleMedium">Card</Typography>
          <Typography variant="bodyMedium">Supporting text in the content slot.</Typography>
        </Card.Content>
        <Card.Actions>
          <Button
            testID="snackbar"
            variant="text"
            onPress={() => snackbar.show({ message: 'Photo saved' })}
          >
            Show a snackbar
          </Button>
        </Card.Actions>
      </Card>

      <View style={styles.row}>
        <Chip variant="assist">Assist</Chip>
        <Chip testID="filter" variant="filter" selected={filter} onPress={() => setFilter(!filter)}>
          Filter
        </Chip>
        <Chip variant="suggestion" onPress={() => {}}>
          Suggestion
        </Chip>
      </View>

      <View style={styles.row}>
        <Checkbox testID="checkbox" value={checked} onValueChange={setChecked} />
        <Radio testID="radio" value={picked} onValueChange={setPicked} />
        <Switch testID="switch" value={on} onValueChange={setOn} />
      </View>

      <TextField
        testID="field"
        label="Email"
        variant="outlined"
        value={email}
        onChangeText={setEmail}
        supportingText="The label moves up on focus"
      />

      <Tabs testID="tabs" items={tabs} value={section} onValueChange={setSection} />
      <Text testID="section">{section}</Text>

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

      <View style={styles.row}>
        <LinearProgress progress={0.4} style={styles.progress} />
        <LinearProgress style={styles.progress} />
        <LinearProgress progress={0.6} wavy style={styles.progress} />
      </View>
      <View style={styles.row}>
        <CircularProgress progress={0.4} />
        <CircularProgress />
        <CircularProgress progress={0.6} wavy />
        <LoadingIndicator accessibilityLabel="Loading" />
        <LoadingIndicator contained accessibilityLabel="Loading" />
      </View>

      <List headline="List" style={styles.card}>
        <ListItem headlineText="One line" onPress={() => {}} />
        <ListDivider />
        <ListItem headlineText="Two lines" supportingText="Supporting text" />
      </List>
      <Divider />

      <View style={styles.row}>
        <Menu anchor={<Button testID="menu">Open the menu</Button>}>
          <Menu.Item testID="menu-item" label="Edit" onPress={() => setPicks(picks + 1)} />
          <Menu.Item label="Duplicate" onPress={() => setPicks(picks + 1)} />
          <Divider />
          <Menu.Item label="Delete" onPress={() => setPicks(picks + 1)} />
        </Menu>
        <Text testID="picks">{picks}</Text>
        <Tooltip
          anchor={
            <Button testID="tooltip" variant="tonal">
              Hover for a tooltip
            </Button>
          }
        >
          Add to favourites
        </Tooltip>
        <Button testID="dialog" onPress={() => setDialog(true)}>
          Open the dialog
        </Button>
        <Button testID="sheet" onPress={() => setSheet(true)}>
          Open the sheet
        </Button>
      </View>

      <Dialog visible={dialog} onDismiss={() => setDialog(false)}>
        <Dialog.Title>Delete file?</Dialog.Title>
        <Dialog.Content>You can't get it back.</Dialog.Content>
        <Dialog.Actions>
          <Button testID="dialog-cancel" variant="text" onPress={() => setDialog(false)}>
            Cancel
          </Button>
          <Button variant="text" onPress={() => setDialog(false)}>
            Delete
          </Button>
        </Dialog.Actions>
      </Dialog>

      <BottomSheet visible={sheet} onDismiss={() => setSheet(false)}>
        <View style={styles.sheet}>
          <Typography variant="titleMedium">Bottom sheet</Typography>
          <Button testID="sheet-close" variant="text" onPress={() => setSheet(false)}>
            Close
          </Button>
        </View>
      </BottomSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { gap: 16, maxWidth: 720, padding: 16, borderRadius: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  card: { maxWidth: 360 },
  progress: { width: 160 },
  sheet: { padding: 24, gap: 12 },
})

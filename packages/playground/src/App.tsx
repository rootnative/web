import { useSyncExternalStore, type ReactElement } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'

import { ActivityIndicatorRoute } from './routes/ActivityIndicatorRoute'
import { AlertRoute } from './routes/AlertRoute'
import { ApisRoute } from './routes/ApisRoute'
import { AppearanceRoute } from './routes/AppearanceRoute'
import { ButtonRoute } from './routes/ButtonRoute'
import { CompatRoute } from './routes/CompatRoute'
import { DimensionsRoute } from './routes/DimensionsRoute'
import { FlatListRoute } from './routes/FlatListRoute'
import { HeadRoute } from './routes/HeadRoute'
import { ImageRoute } from './routes/ImageRoute'
import { InertiaRoute } from './routes/InertiaRoute'
import { KeyboardRoute } from './routes/KeyboardRoute'
import { ModalRoute } from './routes/ModalRoute'
import { PanResponderRoute } from './routes/PanResponderRoute'
import { PressabilityRoute } from './routes/PressabilityRoute'
import { PressableRoute } from './routes/PressableRoute'
import { ReanimatedRoute } from './routes/ReanimatedRoute'
import { RefreshControlRoute } from './routes/RefreshControlRoute'
import { ScrollViewRoute } from './routes/ScrollViewRoute'
import { SwitchRoute } from './routes/SwitchRoute'
import { TextInputRoute } from './routes/TextInputRoute'
import { TextRoute } from './routes/TextRoute'
import { TouchablesRoute } from './routes/TouchablesRoute'
import { ViewRoute } from './routes/ViewRoute'

const routes: ReadonlyArray<{ path: string; title: string; Component: () => ReactElement }> = [
  { path: 'view', title: 'View', Component: ViewRoute },
  { path: 'text', title: 'Text', Component: TextRoute },
  { path: 'image', title: 'Image', Component: ImageRoute },
  { path: 'scrollview', title: 'ScrollView', Component: ScrollViewRoute },
  { path: 'flatlist', title: 'FlatList', Component: FlatListRoute },
  { path: 'refreshcontrol', title: 'RefreshControl', Component: RefreshControlRoute },
  { path: 'textinput', title: 'TextInput', Component: TextInputRoute },
  { path: 'switch', title: 'Switch', Component: SwitchRoute },
  { path: 'activityindicator', title: 'ActivityIndicator', Component: ActivityIndicatorRoute },
  { path: 'modal', title: 'Modal', Component: ModalRoute },
  { path: 'keyboard', title: 'Keyboard', Component: KeyboardRoute },
  { path: 'alert', title: 'Alert', Component: AlertRoute },
  { path: 'dimensions', title: 'Dimensions', Component: DimensionsRoute },
  { path: 'appearance', title: 'Appearance', Component: AppearanceRoute },
  { path: 'apis', title: 'Small APIs', Component: ApisRoute },
  { path: 'pressable', title: 'Pressable', Component: PressableRoute },
  { path: 'button', title: 'Button', Component: ButtonRoute },
  { path: 'touchables', title: 'Touchables', Component: TouchablesRoute },
  { path: 'press', title: 'usePressability', Component: PressabilityRoute },
  { path: 'pan', title: 'PanResponder', Component: PanResponderRoute },
  { path: 'head', title: 'Head', Component: HeadRoute },
  { path: 'compat', title: 'Compat exports', Component: CompatRoute },
  { path: 'reanimated', title: 'Reanimated', Component: ReanimatedRoute },
  { path: 'inertia', title: 'Inertia', Component: InertiaRoute },
]

const subscribe = (onChange: () => void): (() => void) => {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

const getHash = (): string => window.location.hash.slice(1)

export function App(): ReactElement {
  const hash = useSyncExternalStore(subscribe, getHash, () => '')
  const active = routes.find((r) => r.path === hash) ?? routes[0]
  // On a phone, the menu goes over the page, so a route gets the full width.
  const narrow = useWindowDimensions().width < 700

  return (
    <View style={[styles.app, narrow && styles.appNarrow]}>
      <View role="navigation" style={[styles.nav, narrow && styles.navNarrow]}>
        <Text role="heading" aria-level={1} style={styles.brand}>
          rootnative
        </Text>
        {routes.map((route) => (
          <Text
            key={route.path}
            href={`#${route.path}`}
            role="link"
            aria-current={route === active ? 'page' : undefined}
            style={[styles.link, route === active && styles.activeLink]}
          >
            {route.title}
          </Text>
        ))}
      </View>
      <View role="main" style={[styles.main, narrow && styles.mainNarrow]}>
        {active === undefined ? null : <active.Component />}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  app: { flex: 1, flexDirection: 'row', minHeight: '100%' },
  appNarrow: { flexDirection: 'column' },
  nav: { width: 200, padding: 16, gap: 8, backgroundColor: '#f3f4f6' },
  navNarrow: {
    width: 'auto',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    padding: 8,
    columnGap: 12,
    rowGap: 0,
  },
  brand: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  link: { color: '#2563eb', paddingVertical: 4 },
  activeLink: { fontWeight: '600', color: '#111827' },
  main: { flex: 1, minWidth: 0, padding: 24, gap: 16 },
  mainNarrow: { padding: 12 },
})

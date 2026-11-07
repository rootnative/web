import { useSyncExternalStore, type ReactElement } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { DimensionsRoute } from './routes/DimensionsRoute'
import { HeadRoute } from './routes/HeadRoute'
import { PressabilityRoute } from './routes/PressabilityRoute'
import { PressableRoute } from './routes/PressableRoute'
import { TextRoute } from './routes/TextRoute'
import { ViewRoute } from './routes/ViewRoute'

const routes: ReadonlyArray<{ path: string; title: string; Component: () => ReactElement }> = [
  { path: 'view', title: 'View', Component: ViewRoute },
  { path: 'text', title: 'Text', Component: TextRoute },
  { path: 'dimensions', title: 'Dimensions', Component: DimensionsRoute },
  { path: 'pressable', title: 'Pressable', Component: PressableRoute },
  { path: 'press', title: 'usePressability', Component: PressabilityRoute },
  { path: 'head', title: 'Head', Component: HeadRoute },
]

const subscribe = (onChange: () => void): (() => void) => {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

const getHash = (): string => window.location.hash.slice(1)

export function App(): ReactElement {
  const hash = useSyncExternalStore(subscribe, getHash, () => '')
  const active = routes.find((r) => r.path === hash) ?? routes[0]

  return (
    <View style={styles.app}>
      <View role="navigation" style={styles.nav}>
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
      <View role="main" style={styles.main}>
        {active === undefined ? null : <active.Component />}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  app: { flex: 1, flexDirection: 'row', minHeight: '100%' },
  nav: { width: 200, padding: 16, gap: 8, backgroundColor: '#f3f4f6' },
  brand: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  link: { color: '#2563eb', paddingVertical: 4 },
  activeLink: { fontWeight: '600', color: '#111827' },
  main: { flex: 1, padding: 24, gap: 16 },
})

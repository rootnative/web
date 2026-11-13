import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from 'react'
import {
  findNodeHandle,
  StyleSheet,
  Text,
  TurboModuleRegistry,
  View,
  type HostInstance,
} from 'react-native'
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import * as SvgLibrary from 'react-native-svg'

// The types of `react-native-svg` read style and event types from `react-native` that this
// package doesn't export yet, so its props don't resolve. The route checks the runtime.
type Shape = ComponentType<Record<string, unknown> & { children?: ReactNode }>
const { Circle, G, Path, Rect, Svg } = SvgLibrary as unknown as Record<
  'Circle' | 'G' | 'Path' | 'Rect' | 'Svg',
  Shape
>

function Insets(): ReactElement {
  const insets = useSafeAreaInsets()
  return (
    <Text testID="insets">
      Insets: top {insets.top}, right {insets.right}, bottom {insets.bottom}, left {insets.left}
    </Text>
  )
}

// Its own component: `SafeAreaProvider` mounts its children after it measures the insets, so
// an effect of the route runs before the box exists.
function Handles(): ReactElement {
  const box = useRef<HostInstance>(null)
  const [handle, setHandle] = useState('')

  useEffect(() => {
    const node = findNodeHandle(box)
    setHandle(node instanceof Element ? `<${node.tagName.toLowerCase()}>` : String(node))
  }, [])

  return (
    <>
      <View ref={box} style={styles.box} />
      <Text testID="handle">findNodeHandle(ref): {handle}</Text>
      <Text testID="turbo">
        TurboModuleRegistry.get('RNCSafeAreaContext'):{' '}
        {String(TurboModuleRegistry.get('RNCSafeAreaContext'))}
      </Text>
    </>
  )
}

export function CompatRoute(): ReactElement {
  const [presses, setPresses] = useState(0)

  return (
    <SafeAreaProvider>
      <View style={styles.page}>
        <Text style={styles.title}>react-native-svg</Text>
        <Svg width={160} height={80} viewBox="0 0 160 80" testID="svg">
          <Rect x={4} y={4} width={72} height={72} rx={12} fill="#2563eb" />
          <Circle cx={120} cy={40} r={32} fill="#f59e0b" onPress={() => setPresses((n) => n + 1)} />
          <G stroke="#ffffff" strokeWidth={6} strokeLinecap="round" fill="none">
            <Path d="M24 42 L36 54 L58 28" />
          </G>
        </Svg>
        <Text testID="presses">Circle presses: {presses}</Text>

        <Text style={styles.title}>react-native-safe-area-context</Text>
        <SafeAreaView style={styles.safe}>
          <Insets />
        </SafeAreaView>

        <Text style={styles.title}>findNodeHandle and TurboModuleRegistry</Text>
        <Handles />
      </View>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  page: { gap: 12 },
  title: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  safe: { backgroundColor: '#e2e8f0', padding: 8, borderRadius: 8 },
  box: { width: 48, height: 24, backgroundColor: '#16a34a', borderRadius: 4 },
})

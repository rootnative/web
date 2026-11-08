import { useState, type ReactElement } from 'react'
import { Image, StyleSheet, Text, View, type ImageLoadEvent } from 'react-native'

// Inline SVGs, so the playground works offline. The label shows which one loaded.
const svg = (label: string, from: string, to: string, width = 300, height = 200): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>` +
      `<rect width="${width}" height="${height}" fill="url(#g)"/>` +
      `<circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 3}" fill="rgba(255,255,255,0.4)"/>` +
      `<text x="50%" y="55%" text-anchor="middle" font-family="system-ui" font-size="${height / 6}" fill="#111">${label}</text>` +
      `</svg>`,
  )}`

const WIDE = svg('300 × 200', '#60a5fa', '#a78bfa')
const ONE_X = svg('1x', '#34d399', '#60a5fa', 120, 80)
const TWO_X = svg('2x', '#f59e0b', '#ef4444', 240, 160)
const TILE = svg('', '#fde68a', '#fca5a5', 40, 40)
const MARK = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.5 4.5L18.5 22 12 17.5 5.5 22l2-8.5L2 9h7z"/></svg>',
)}`

const MODES = ['cover', 'contain', 'stretch', 'center', 'repeat'] as const

export function ImageRoute(): ReactElement {
  const [loaded, setLoaded] = useState('')

  const onLoad = (event: ImageLoadEvent): void => {
    const { width, height } = event.nativeEvent.source
    setLoaded(`${width} × ${height}`)
  }

  return (
    <>
      <Text role="heading" aria-level={2} style={styles.title}>
        Image
      </Text>

      <Text>Each resizeMode in a 120 × 80 box with a border radius.</Text>
      <View style={styles.row}>
        {MODES.map((mode) => (
          <View key={mode} style={styles.cell}>
            <Image
              source={{ uri: mode === 'repeat' ? TILE : WIDE }}
              resizeMode={mode}
              style={styles.thumb}
              alt={`${mode} example`}
            />
            <Text style={styles.caption}>{mode}</Text>
          </View>
        ))}
      </View>

      <Text>tintColor paints the color through the image, as a mask. blurRadius blurs.</Text>
      <View style={styles.row}>
        <Image source={{ uri: MARK }} tintColor="#2563eb" style={styles.icon} alt="Star, blue" />
        <Image source={{ uri: MARK }} tintColor="#dc2626" style={styles.icon} alt="Star, red" />
        <Image source={{ uri: WIDE }} blurRadius={4} style={styles.thumb} alt="Blurred" />
      </View>

      <Text>
        A source list with scales is a srcset. Zoom the page or move it to a 2x display to switch
        images. Loaded: {loaded || '…'}
      </Text>
      <Image
        source={[
          { uri: ONE_X, scale: 1 },
          { uri: TWO_X, scale: 2 },
        ]}
        style={styles.thumb}
        onLoad={onLoad}
        alt="Density example"
      />

      <Text>
        Without a style the box has no size, as on native. The source size sets a default.
      </Text>
      <View style={styles.row}>
        <View style={styles.outline}>
          <Image source={{ uri: WIDE }} alt="No size" />
        </View>
        <View style={styles.outline}>
          <Image source={{ uri: WIDE, width: 90, height: 60 }} alt="Source size" />
        </View>
      </View>

      <Text>Web hints: loading="lazy", fetchPriority, decoding pass to the img.</Text>
      <Image
        source={{ uri: WIDE }}
        loading="lazy"
        decoding="async"
        style={styles.thumb}
        alt="Lazy"
      />
    </>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' },
  cell: { alignItems: 'center', gap: 4 },
  thumb: { width: 120, height: 80, borderRadius: 8, backgroundColor: '#e5e7eb' },
  icon: { width: 48, height: 48 },
  caption: { fontSize: 12, color: '#6b7280' },
  outline: { borderWidth: 1, borderColor: '#9ca3af', borderStyle: 'dashed', padding: 2 },
})

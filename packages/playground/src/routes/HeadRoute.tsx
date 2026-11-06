import { useState, type ReactElement } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { Head } from '@rootnative/web/dom'

export function HeadRoute(): ReactElement {
  const [title, setTitle] = useState('Head demo')

  return (
    <>
      <Head
        title={title}
        description="A page rendered by the rootnative playground"
        canonical="https://example.com/head"
        themeColor="#2563eb"
        openGraph={{ title, type: 'website', siteName: 'rootnative' }}
        jsonLd={{ '@context': 'https://schema.org', '@type': 'WebPage', name: title }}
      />

      <Text role="heading" aria-level={2} style={styles.title}>
        Head
      </Text>
      <Text>The tab title, meta tags, canonical link, and JSON-LD come from the Head element.</Text>
      <Text>Open the inspector and look at the document head.</Text>

      <View role="group" style={styles.buttons}>
        <Text onPress={() => setTitle('Head demo')} style={styles.button}>
          Title A
        </Text>
        <Text onPress={() => setTitle('Another title')} style={styles.button}>
          Title B
        </Text>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600' },
  buttons: { flexDirection: 'row', gap: 8 },
  button: { padding: 8, backgroundColor: '#e5e7eb', borderRadius: 6, cursor: 'pointer' },
})

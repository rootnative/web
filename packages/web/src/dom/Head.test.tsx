import { renderToString } from 'react-dom/server.browser'
import { afterEach, describe, expect, test } from 'vitest'

import { cleanup, render } from '../test/render'
import { Head } from './Head'

const meta = (selector: string): string | null =>
  document.head.querySelector<HTMLMetaElement>(selector)?.getAttribute('content') ?? null

afterEach(() => {
  cleanup()
  document.title = ''
})

describe('Head', () => {
  test('hoists title, meta, and link into the document head', () => {
    render(
      <Head
        title="Page"
        description="About the page"
        robots="noindex"
        themeColor="#fff"
        canonical="https://example.com/page"
        openGraph={{ title: 'OG', image: 'https://example.com/i.png', siteName: 'Site' }}
      >
        <meta name="author" content="Me" />
      </Head>,
    )

    expect(document.title).toBe('Page')
    expect(meta('meta[name="description"]')).toBe('About the page')
    expect(meta('meta[name="robots"]')).toBe('noindex')
    expect(meta('meta[name="theme-color"]')).toBe('#fff')
    expect(meta('meta[property="og:title"]')).toBe('OG')
    expect(meta('meta[property="og:image"]')).toBe('https://example.com/i.png')
    expect(meta('meta[property="og:site_name"]')).toBe('Site')
    expect(meta('meta[name="author"]')).toBe('Me')
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://example.com/page',
    )
  })

  test('removes its elements on unmount', () => {
    const { unmount } = render(<Head title="Gone" description="Gone" />)
    expect(meta('meta[name="description"]')).toBe('Gone')
    unmount()
    expect(meta('meta[name="description"]')).toBeNull()
  })

  test('renders JSON-LD with closing tags escaped', () => {
    const html = renderToString(<Head jsonLd={{ '@type': 'Article', headline: '</script><b>x' }} />)
    expect(html).toContain('<script type="application/ld+json">')
    expect(html).toContain('"@type":"Article"')
    expect(html).not.toContain('</script><b>')
  })

  test('renders nothing without props', () => {
    expect(renderToString(<Head />)).toBe('')
  })
})

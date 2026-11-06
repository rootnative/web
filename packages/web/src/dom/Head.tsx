import { createElement, Fragment, type ReactElement, type ReactNode } from 'react'

export type OpenGraph = {
  title?: string | undefined
  description?: string | undefined
  image?: string | undefined
  url?: string | undefined
  type?: string | undefined
  siteName?: string | undefined
}

export type HeadProps = {
  title?: string | undefined
  description?: string | undefined
  canonical?: string | undefined
  robots?: string | undefined
  themeColor?: string | undefined
  openGraph?: OpenGraph | undefined
  // One or more schema.org objects, rendered as JSON-LD.
  jsonLd?: Record<string, unknown> | ReadonlyArray<Record<string, unknown>> | undefined
  // Extra head elements: <meta>, <link>, <title>. React moves them into <head>.
  children?: ReactNode
}

const openGraphKeys: ReadonlyArray<[keyof OpenGraph, string]> = [
  ['title', 'og:title'],
  ['description', 'og:description'],
  ['image', 'og:image'],
  ['url', 'og:url'],
  ['type', 'og:type'],
  ['siteName', 'og:site_name'],
]

// A closing tag inside a script would end it early.
const escapeJSON = (json: string): string => json.replace(/</g, '\\u003c')

// Use one Head per page. React 19 hoists <title>, <meta>, and <link> into <head> on the
// server and the client, but it does not merge two Heads.
export function Head(props: HeadProps): ReactElement {
  const { canonical, children, description, jsonLd, openGraph, robots, themeColor, title } = props
  const nodes: ReactNode[] = []

  if (title !== undefined) nodes.push(createElement('title', { key: 'title' }, title))
  if (description !== undefined) {
    nodes.push(
      createElement('meta', { key: 'description', name: 'description', content: description }),
    )
  }
  if (robots !== undefined) {
    nodes.push(createElement('meta', { key: 'robots', name: 'robots', content: robots }))
  }
  if (themeColor !== undefined) {
    nodes.push(
      createElement('meta', { key: 'theme-color', name: 'theme-color', content: themeColor }),
    )
  }
  if (canonical !== undefined) {
    nodes.push(createElement('link', { key: 'canonical', rel: 'canonical', href: canonical }))
  }
  if (openGraph !== undefined) {
    for (const [key, property] of openGraphKeys) {
      const content = openGraph[key]
      if (content !== undefined)
        nodes.push(createElement('meta', { key: property, property, content }))
    }
  }
  if (jsonLd !== undefined) {
    nodes.push(
      createElement('script', {
        key: 'json-ld',
        type: 'application/ld+json',
        dangerouslySetInnerHTML: { __html: escapeJSON(JSON.stringify(jsonLd)) },
      }),
    )
  }

  return createElement(Fragment, null, ...nodes, children)
}

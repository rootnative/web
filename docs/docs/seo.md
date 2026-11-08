---
id: seo
title: SEO
description: Set the title, meta tags, Open Graph tags, and JSON-LD of a page with the Head component.
---

# SEO

`Head` sets the title and the meta tags of a page. React 19 moves them into `<head>`, on the server and in the browser.

```tsx
import { Head } from '@rootnative/web/dom'

export function ArticleScreen() {
  return (
    <View role="main">
      <Head
        title="Page title"
        description="What the page is about"
        canonical="https://example.com/page"
        openGraph={{ title: 'Page title', image: 'https://example.com/og.png' }}
        jsonLd={{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Page title' }}
      />
      {/* The page */}
    </View>
  )
}
```

`Head` is in the web layer. Import it only in code that runs on the web.

## Props

| Prop          | Renders                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| `title`       | `<title>`                                                                                               |
| `description` | `<meta name="description">`                                                                             |
| `canonical`   | `<link rel="canonical">`                                                                                |
| `robots`      | `<meta name="robots">`, for example `"noindex"`                                                         |
| `themeColor`  | `<meta name="theme-color">`                                                                             |
| `openGraph`   | One `<meta property="og:…">` for each of `title`, `description`, `image`, `url`, `type`, and `siteName` |
| `jsonLd`      | `<script type="application/ld+json">`, from one schema.org object or an array of them                   |
| `children`    | Extra `<meta>`, `<link>`, and `<title>` elements                                                        |

Use `children` for a tag that has no prop, for example a Twitter card:

```tsx
<Head title="Page title">
  <meta name="twitter:card" content="summary_large_image" />
</Head>
```

## Rules

- **Use one `Head` per page.** React doesn't merge two of them.
- **A `Head` leaves with its screen.** Its elements go away when it unmounts, so the next screen's `Head` starts clean.
- **The JSON-LD script stays where `Head` renders,** in the body. Search engines read JSON-LD there too. A `<` in the data is escaped, so a string can't close the script.
- **Set the theme color in one place.** `themeColor` and the `backgroundColor` of `StatusBar` write the same meta tag.
- **On the server, render the `<head>` with React,** so the tags land in it. See [Server rendering](/server-rendering).

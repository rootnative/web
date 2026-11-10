import type * as Preset from '@docusaurus/preset-classic'
import type { Config } from '@docusaurus/types'
import { themes } from 'prism-react-renderer'

// Docusaurus adds `baseUrl` to `favicon` and `themeConfig.image`, but not to a `headTags` href, so
// the apple-touch-icon builds its href from this value.
const baseUrl = '/web/'

const config: Config = {
  title: 'Root Native Web',
  tagline: 'A standalone web runtime for React Native apps',
  url: 'https://rootnative.github.io',
  baseUrl,
  favicon: 'img/favicon.png',
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  headTags: [
    {
      tagName: 'link',
      attributes: {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: `${baseUrl}img/favicon.png`,
      },
    },
    {
      tagName: 'link',
      attributes: { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossorigin: 'anonymous',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
      },
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: 'https://github.com/rootnative/web/edit/main/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        docsRouteBasePath: '/',
        indexBlog: false,
      },
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    image: 'img/social-card.png',
    navbar: {
      title: 'Root Native Web',
      logo: {
        src: 'img/logo.svg',
        srcDark: 'img/logo-dark.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          label: 'Docs',
          position: 'left',
        },
        {
          href: 'https://github.com/rootnative/web',
          position: 'right',
          className: 'navbar-github-link',
          'aria-label': 'GitHub repository',
        },
      ],
    },
    footer: {
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Introduction', to: '/introduction' },
            { label: 'Installation', to: '/installation' },
            { label: 'Status', to: '/status' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'GitHub', href: 'https://github.com/rootnative/web' },
            { label: 'npm', href: 'https://www.npmjs.com/package/@rootnative/web' },
            {
              label: 'Changelog',
              href: 'https://github.com/rootnative/web/blob/main/packages/web/CHANGELOG.md',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Root Native. MIT License.`,
    },
    prism: {
      theme: themes.github,
      darkTheme: themes.dracula,
      additionalLanguages: ['bash'],
    },
  } satisfies Preset.ThemeConfig,
}

export default config

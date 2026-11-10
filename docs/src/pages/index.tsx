import Link from '@docusaurus/Link'
import useBaseUrl from '@docusaurus/useBaseUrl'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import ThemedImage from '@theme/ThemedImage'
import { useState, type ReactNode, type SVGProps } from 'react'

import styles from './index.module.css'

function stroke(children: ReactNode) {
  return function Icon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        {children}
      </svg>
    )
  }
}

const IconParity = stroke(
  <>
    <path d="M8 3 4 7l4 4" />
    <path d="M4 7h16" />
    <path d="m16 21 4-4-4-4" />
    <path d="M20 17H4" />
  </>,
)

const IconCode = stroke(
  <>
    <path d="m16 18 6-6-6-6" />
    <path d="m8 6-6 6 6 6" />
  </>,
)

const IconGrid = stroke(
  <>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </>,
)

const IconServer = stroke(
  <>
    <rect x="2" y="3" width="20" height="8" rx="2" />
    <rect x="2" y="13" width="20" height="8" rx="2" />
    <path d="M6 7h.01" />
    <path d="M6 17h.01" />
  </>,
)

const IconSearch = stroke(
  <>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </>,
)

const IconTested = stroke(
  <>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="m9 11 3 3L22 4" />
  </>,
)

const IconCopy = stroke(
  <>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2" />
  </>,
)

const IconCheck = stroke(<path d="m4 12 5 5L20 6" />)

const IconArrowDown = stroke(
  <>
    <path d="M12 5v14" />
    <path d="m19 12-7 7-7-7" />
  </>,
)

const INSTALL_COMMAND = 'npm install @rootnative/web'

function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)

  const onCopy = () => {
    navigator.clipboard?.writeText(command).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    })
  }

  return (
    <button
      type="button"
      className={styles.copyCommand}
      onClick={onCopy}
      aria-label="Copy the install command"
    >
      <span className={styles.copyPrompt}>$</span>
      <code className={styles.copyText}>{command}</code>
      <span className={styles.copyIcon}>
        {copied ? (
          <IconCheck className={styles.copyGlyph} />
        ) : (
          <IconCopy className={styles.copyGlyph} />
        )}
      </span>
    </button>
  )
}

type Tone = 'tag' | 'attr' | 'string' | 'number' | 'keyword' | 'muted'

const TONE_CLASS: Record<Tone, string> = {
  tag: styles.tokTag,
  attr: styles.tokAttr,
  string: styles.tokString,
  number: styles.tokNumber,
  keyword: styles.tokKeyword,
  muted: styles.tokMuted,
}

type Segment = readonly [text: string, tone?: Tone]
type Line = readonly Segment[]

function CodePanel({
  label,
  filename,
  lines,
  ariaLabel,
}: {
  label?: string
  filename: string
  lines: readonly Line[]
  ariaLabel: string
}) {
  return (
    <figure className={styles.codePanel}>
      <figcaption className={styles.codeHeader}>
        <span className={styles.codeFilename}>{filename}</span>
        {label ? <span className={styles.codeLabel}>{label}</span> : null}
      </figcaption>
      <pre className={styles.codePre} tabIndex={0} aria-label={ariaLabel}>
        <code>
          {lines.map((line, index) => (
            <span key={index}>
              {line.map(([text, tone], part) => (
                <span key={part} className={tone === undefined ? undefined : TONE_CLASS[tone]}>
                  {text}
                </span>
              ))}
              {'\n'}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  )
}

const APP_LINES: readonly Line[] = [
  [
    ['<'],
    ['View', 'tag'],
    [' '],
    ['role', 'attr'],
    ['='],
    ['"main"', 'string'],
    [' '],
    ['style', 'attr'],
    ['={{ padding: '],
    ['16', 'number'],
    [' }}>'],
  ],
  [
    ['  <'],
    ['Text', 'tag'],
    [' '],
    ['role', 'attr'],
    ['='],
    ['"heading"', 'string'],
    [' '],
    ['aria-level', 'attr'],
    ['={'],
    ['1', 'number'],
    ['}>'],
  ],
  [['    Hello from React Native']],
  [['  </'], ['Text', 'tag'], ['>']],
  [
    ['  <'],
    ['Text', 'tag'],
    [' '],
    ['href', 'attr'],
    ['='],
    ['"/about"', 'string'],
    ['>About</'],
    ['Text', 'tag'],
    ['>'],
  ],
  [['</'], ['View', 'tag'], ['>']],
]

// The real server output of APP_LINES, with the class lists cut short. Render it again when the
// style defaults change, because the class names are hashes of the declarations.
const HTML_LINES: readonly Line[] = [
  [
    ['<'],
    ['main', 'tag'],
    [' '],
    ['class', 'attr'],
    ['='],
    ['"rn-hxnk25 rn-vylb87 …"', 'string'],
    ['>'],
  ],
  [
    ['  <'],
    ['h1', 'tag'],
    [' '],
    ['class', 'attr'],
    ['='],
    ['"rn-vylb87 rn-qgdmll …"', 'string'],
    ['>Hello from React Native</'],
    ['h1', 'tag'],
    ['>'],
  ],
  [
    ['  <'],
    ['a', 'tag'],
    [' '],
    ['href', 'attr'],
    ['='],
    ['"/about"', 'string'],
    [' '],
    ['class', 'attr'],
    ['='],
    ['"rn-vylb87 …"', 'string'],
    ['>About</'],
    ['a', 'tag'],
    ['>'],
  ],
  [['</'], ['main', 'tag'], ['>']],
  [
    ['<'],
    ['style', 'tag'],
    ['>.rn-hst5or{padding:'],
    ['16px', 'number'],
    ['} '],
    ['…', 'muted'],
    ['</'],
    ['style', 'tag'],
    ['>'],
  ],
]

const VITE_LINES: readonly Line[] = [
  [
    ['import', 'keyword'],
    [' react '],
    ['from', 'keyword'],
    [' '],
    ["'@vitejs/plugin-react'", 'string'],
  ],
  [['import', 'keyword'], [' { defineConfig } '], ['from', 'keyword'], [' '], ["'vite'", 'string']],
  [],
  [['export default', 'keyword'], [' defineConfig({']],
  [['  plugins: [react()],']],
  [['  resolve: {']],
  [
    ['    alias: { '],
    ["'react-native'", 'string'],
    [': '],
    ["'@rootnative/web'", 'string'],
    [' },'],
  ],
  [['  },']],
  [['})']],
]

function Hero() {
  const markLight = useBaseUrl('/img/logo.svg')
  const markDark = useBaseUrl('/img/logo-dark.svg')

  return (
    <header className={styles.hero}>
      <div className={styles.heroGrid} aria-hidden="true" />
      <div className={styles.heroInner}>
        <div className={styles.heroContent}>
          <ThemedImage
            className={styles.heroMark}
            sources={{ light: markLight, dark: markDark }}
            alt=""
            width={56}
            height={56}
          />
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden="true" />
            Early alpha
          </span>
          <h1 className={styles.heroTitle}>React Native, as a real web app.</h1>
          <p className={styles.heroTagline}>
            A standalone web runtime for React Native apps. You write <code>react-native</code>. The
            browser gets semantic HTML, atomic CSS, server rendering, and SEO tags.
          </p>
          <div className={styles.heroCtas}>
            <Link className={styles.ctaPrimary} to="/installation">
              Get started
            </Link>
            <Link className={styles.ctaSecondary} to="/introduction">
              Read the docs
            </Link>
          </div>
          <CopyCommand command={INSTALL_COMMAND} />
          <ul className={styles.facts} aria-label="Package facts">
            <li>React 19</li>
            <li>TypeScript</li>
            <li>ESM only</li>
            <li>MIT</li>
          </ul>
        </div>
        <div className={styles.heroVisual}>
          <CodePanel
            filename="App.tsx"
            label="You write"
            lines={APP_LINES}
            ariaLabel="A React Native View with a heading Text and a link Text"
          />
          <div className={styles.flowArrow} aria-hidden="true">
            <IconArrowDown className={styles.flowGlyph} />
          </div>
          <CodePanel
            filename="index.html"
            label="The browser gets"
            lines={HTML_LINES}
            ariaLabel="The server HTML: a main element with an h1 and a link, styled with atomic CSS classes"
          />
        </div>
      </div>
    </header>
  )
}

const features = [
  {
    title: 'Parity first',
    description: (
      <>
        Every <code>react-native</code> export that ships behaves as it does on iOS and Android.
      </>
    ),
    to: '/status',
    Icon: IconParity,
  },
  {
    title: 'Semantic HTML',
    description: (
      <>
        The <code>role</code> prop picks the element. A <code>View</code> with{' '}
        <code>role="main"</code> is a <code>&lt;main&gt;</code>, and <code>href</code> makes an{' '}
        <code>&lt;a&gt;</code>.
      </>
    ),
    to: '/semantic-html',
    Icon: IconCode,
  },
  {
    title: 'Atomic CSS',
    description: (
      <>
        Each style declaration becomes one CSS class, and every element with the same declaration
        shares it.
      </>
    ),
    to: '/styles',
    Icon: IconGrid,
  },
  {
    title: 'Server rendering',
    description: (
      <>Render the whole page on the server with its style tags, then hydrate it in the browser.</>
    ),
    to: '/server-rendering',
    Icon: IconServer,
  },
  {
    title: 'SEO tags',
    description: (
      <>
        Set the title, the meta tags, Open Graph, and JSON-LD of each page with <code>Head</code>.
      </>
    ),
    to: '/seo',
    Icon: IconSearch,
  },
  {
    title: 'Tested in a real browser',
    description: (
      <>Every component and API has tests that run in Chromium, not in a simulated DOM.</>
    ),
    to: '/status#how-its-tested',
    Icon: IconTested,
  },
]

function Features() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionInner}>
        <span className={styles.sectionEyebrow}>Why Root Native Web</span>
        <h2 className={styles.sectionTitle}>
          What does a React Native app need to be a good web app?
        </h2>
        <div className={styles.featuresGrid}>
          {features.map(({ title, description, to, Icon }) => (
            <Link key={title} className={styles.featureCard} to={to}>
              <div className={styles.featureIcon}>
                <Icon className={styles.featureGlyph} />
              </div>
              <h3 className={styles.featureTitle}>{title}</h3>
              <p className={styles.featureDescription}>{description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

const layers = [
  {
    name: 'Parity',
    entry: '@rootnative/web',
    description: 'The React Native components and APIs.',
  },
  {
    name: 'Web',
    entry: '@rootnative/web/dom',
    description: (
      <>
        Browser features that native doesn't have, for example <code>&lt;Head&gt;</code>.
      </>
    ),
  },
  {
    name: 'Server',
    entry: '@rootnative/web/server',
    description: 'Helpers that render the page and its styles on the server.',
  },
]

function Layers() {
  return (
    <section className={`${styles.section} ${styles.sectionMuted}`}>
      <div className={styles.sectionInner}>
        <span className={styles.sectionEyebrow}>How it works</span>
        <h2 className={styles.sectionTitle}>One alias. Three entry points.</h2>
        <p className={styles.sectionLead}>
          Your app imports <code>react-native</code>. A bundler alias maps that name to{' '}
          <code>@rootnative/web</code>. Import the web and the server entry only in code that runs
          on the web.
        </p>
        <div className={styles.layersGrid}>
          {layers.map((layer, index) => (
            <div key={layer.name} className={styles.layerCard}>
              <span className={styles.layerNumber}>{String(index + 1).padStart(2, '0')}</span>
              <h3 className={styles.layerTitle}>{layer.name}</h3>
              <code className={styles.layerEntry}>{layer.entry}</code>
              <p className={styles.layerDescription}>{layer.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Setup() {
  return (
    <section className={styles.section}>
      <div className={styles.setupInner}>
        <div className={styles.setupText}>
          <span className={styles.sectionEyebrow}>Set up</span>
          <h2 className={styles.sectionTitle}>
            Point <code>react-native</code> at the package.
          </h2>
          <p className={styles.sectionLead}>
            Add one alias to <code>vite.config.ts</code> and one declaration file for TypeScript.
            The rest of your app stays the same code that runs on iOS and Android.
          </p>
          <Link className={styles.ctaPrimary} to="/installation">
            Read the installation guide
          </Link>
        </div>
        <CodePanel
          filename="vite.config.ts"
          lines={VITE_LINES}
          ariaLabel="A Vite config that aliases react-native to @rootnative/web"
        />
      </div>
    </section>
  )
}

function BottomCta() {
  return (
    <section className={styles.bottomCta}>
      <div className={styles.bottomCtaInner}>
        <h2 className={styles.bottomCtaTitle}>Your React Native code, in the browser.</h2>
        <p className={styles.bottomCtaText}>
          It's an early alpha. The Status page lists what ships today and what's planned.
        </p>
        <div className={styles.heroCtas}>
          <Link className={styles.ctaPrimary} to="/installation">
            Get started
          </Link>
          <Link className={styles.ctaSecondary} to="/status">
            See the status
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext()

  return (
    <Layout description={siteConfig.tagline}>
      <main className={styles.landing}>
        <Hero />
        <Features />
        <Layers />
        <Setup />
        <BottomCta />
      </main>
    </Layout>
  )
}

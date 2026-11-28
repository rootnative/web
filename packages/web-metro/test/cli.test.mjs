import { join } from 'node:path'

import { afterEach, describe, expect, test, vi } from 'vitest'

import { hashedName, main, pageFromTemplate, parseOptions, USAGE } from '../cli.mjs'

const projectRoot = '/work/app'
const hasWebEntry = (path) => path === join(projectRoot, 'index.web.js')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the options of rootnative-web build', () => {
  test('default to index.web.js, the dist folder, no source map, and the Metro cache', () => {
    expect(parseOptions(['build'], projectRoot, hasWebEntry)).toEqual({
      help: false,
      entryFile: 'index.web.js',
      outputDir: '/work/app/dist',
      sourcemap: false,
      resetCache: false,
    })
  })

  test('take index.js when the app has no index.web.js', () => {
    expect(parseOptions(['build'], projectRoot, () => false).entryFile).toBe('index.js')
  })

  test('take each option', () => {
    const options = parseOptions(
      [
        'build',
        '--entry-file',
        'src/web.js',
        '--output-dir',
        'out',
        '--sourcemap',
        '--reset-cache',
      ],
      projectRoot,
      hasWebEntry,
    )
    expect(options).toMatchObject({
      entryFile: 'src/web.js',
      outputDir: '/work/app/out',
      sourcemap: true,
      resetCache: true,
    })
    expect(parseOptions(['build', '--output-dir', '../site'], projectRoot).outputDir).toBe(
      '/work/site',
    )
  })

  test.each([['.'], ['..'], ['/']])('refuse the output folder %s, which holds the app', (dir) => {
    expect(() => parseOptions(['build', '--output-dir', dir], projectRoot)).toThrow(/holds the app/)
  })

  test.each([[[]], [['serve']], [['build', 'extra']], [['build', '--minify']]])(
    'refuse %j',
    (argv) => {
      expect(() => parseOptions(argv, projectRoot)).toThrow()
    },
  )
})

describe('the hashed name of the bundle', () => {
  test('follows the content', () => {
    expect(hashedName('a')).toMatch(/^index-[0-9a-f]{12}\.js$/)
    expect(hashedName('a')).toBe(hashedName('a'))
    expect(hashedName('a')).not.toBe(hashedName('b'))
  })
})

describe('the page from the index.html of the app', () => {
  test('loads the bundle in place of the dev bundle', () => {
    const html = `<title>Shop</title><script defer src="/index.bundle?platform=web&amp;dev=true"></script>`
    expect(pageFromTemplate(html, '/index-abc.js')).toBe(
      '<title>Shop</title><script defer src="/index-abc.js"></script>',
    )
    expect(pageFromTemplate("<script src='/index.bundle?platform=web'></script>", '/b.js')).toBe(
      "<script src='/b.js'></script>",
    )
  })

  test('throws when it has no script of the dev bundle', () => {
    expect(() => pageFromTemplate('<script src="/app.js"></script>', '/b.js')).toThrow(
      /no <script src="\/index\.bundle/,
    )
  })
})

describe('main', () => {
  test('shows the usage for --help, and exits with 0', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(main(['--help'], projectRoot)).toBe(0)
    expect(log).toHaveBeenCalledWith(USAGE)
  })

  test('explains an unknown command, and exits with 1', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(main(['serve'], projectRoot)).toBe(1)
    expect(error).toHaveBeenCalledWith('rootnative-web: Unknown command: serve.')
  })
})

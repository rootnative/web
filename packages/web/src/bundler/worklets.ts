/**
 * The source of a file that can hold a worklet: a `'worklet'` directive, an import of
 * Reanimated or Worklets, or a call that the Worklets Babel plugin turns into a worklet.
 */
export const WORKLET_CODE: RegExp =
  /worklet|reanimated|useAnimated|useDerivedValue|useFrameCallback|runOnUI|scheduleOnUI|with(?:Timing|Spring|Decay|Repeat)\b/

const SCRIPT_FILE = /\.[cm]?[jt]sx?$/

// The map is JSON text, which every bundler takes.
export type WorkletTransformResult = { code: string; map: string | null }

export type WorkletTransform = (code: string, id: string) => Promise<WorkletTransformResult | null>

type BabelCore = {
  transformAsync: (
    code: string,
    options: Record<string, unknown>,
  ) => Promise<{ code?: string | null; map?: object | null } | null>
}

type Require = ((id: string) => unknown) & { resolve: (id: string) => string }

type Tools = { babel: BabelCore; plugin: string }

const missing = (name: string): Error =>
  new Error(
    `[@rootnative/web] The \`worklets\` option needs \`${name}\`, and the app doesn't have it. ` +
      `Install it, or remove the option.`,
  )

const loadTools = async (root: string): Promise<Tools> => {
  // Only Node runs this file. A dynamic import keeps the browser entries free of it.
  const { createRequire } = await import('node:module')
  const { resolve } = await import('node:path')
  const fromRoot = createRequire(resolve(root, 'package.json')) as Require

  let plugin: string
  let workletsManifest: string
  try {
    plugin = fromRoot.resolve('react-native-worklets/plugin')
    workletsManifest = fromRoot.resolve('react-native-worklets/package.json')
  } catch {
    throw missing('react-native-worklets')
  }

  // Babel is a peer of Worklets. A strict package layout links it beside Worklets, not in the app.
  for (const load of [fromRoot, createRequire(workletsManifest) as Require]) {
    try {
      return { babel: load('@babel/core') as BabelCore, plugin }
    } catch {
      // Try the next place.
    }
  }
  throw missing('@babel/core')
}

/**
 * Makes the transform that runs the Worklets Babel plugin on one file, as the Babel preset of a
 * React Native app does. It finds the plugin and Babel from the root of the app, on the first
 * file that needs them.
 */
export const createWorkletTransform = (root: string): WorkletTransform => {
  let tools: Promise<Tools> | undefined

  return async (code, id) => {
    const file = id.split('?')[0] as string
    if (file.startsWith('\0') || !SCRIPT_FILE.test(file) || !WORKLET_CODE.test(code)) return null

    tools ??= loadTools(root)
    const { babel, plugin } = await tools

    // A library can ship TypeScript or JSX source. Babel reads the syntax and keeps it.
    const syntax: string[] = []
    if (/\.[cm]?tsx?$/.test(file)) syntax.push('typescript')
    if (/\.[jt]sx$/.test(file)) syntax.push('jsx')

    const result = await babel.transformAsync(code, {
      filename: file,
      babelrc: false,
      configFile: false,
      sourceMaps: true,
      parserOpts: { plugins: syntax },
      plugins: [plugin],
    })
    if (result?.code == null) return null
    return { code: result.code, map: result.map == null ? null : JSON.stringify(result.map) }
  }
}

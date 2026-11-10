export { inlinePlatformOS } from './inlinePlatformOS'

/** Module names that resolve to this package. Each one matches the exact name only. */
export const ALIASES: Readonly<Record<string, string>> = {
  'react-native': '@rootnative/web',
}

/**
 * Puts a `.web` variant of each extension first, as Metro does for the web platform. An
 * import of `./Button` then finds `Button.web.tsx` before `Button.tsx`.
 */
export const webExtensions = (extensions: readonly string[]): string[] => {
  const web = extensions.map((extension) =>
    extension.startsWith('.web.') ? extension : `.web${extension}`,
  )
  return [...new Set([...web, ...extensions])]
}

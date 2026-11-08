import { warnOnce } from '../../utils/warn'
import type { ImageResolvedAssetSource, ImageSource, ImageURISource } from './types'

export type ImageRequest = {
  method: string
  headers: Record<string, string> | undefined
  body: string | undefined
}

export type ResolvedSource = {
  // The URL the <img> loads, or the URL the request fetches.
  src: string | undefined
  srcSet: string | undefined
  sizes: string | undefined
  // The intrinsic size from the source, used when the style has none.
  width: number | undefined
  height: number | undefined
  // Set when the source carries headers, a method, or a body.
  request: ImageRequest | undefined
}

const none: ResolvedSource = Object.freeze({
  src: undefined,
  srcSet: undefined,
  sizes: undefined,
  width: undefined,
  height: undefined,
  request: undefined,
})

const ASSET_ID_WARNING =
  'Image: a numeric source is a Metro asset id, which has no meaning here. Import the image file and pass its URL.'

const hasURI = (source: ImageURISource): source is ImageURISource & { uri: string } =>
  typeof source.uri === 'string' && source.uri.length > 0

const requestOf = (source: ImageURISource): ImageRequest | undefined => {
  if (source.headers === undefined && source.method === undefined && source.body === undefined) {
    return undefined
  }
  return { method: source.method ?? 'GET', headers: source.headers, body: source.body }
}

const single = (source: ImageURISource & { uri: string }): ResolvedSource => ({
  src: source.uri,
  srcSet: undefined,
  sizes: undefined,
  width: source.width,
  height: source.height,
  request: requestOf(source),
})

// The first URL of a srcset, for the `src` fallback.
const firstCandidate = (srcSet: string): string | undefined =>
  srcSet.split(',')[0]?.trim().split(/\s+/)[0]

// A list of sources becomes a srcset. Each entry needs a width (`w`
// descriptors, the browser picks by layout width) or a scale (`x`
// descriptors, the browser picks by device pixel ratio). A mixed list falls
// back to its first entry, as Android does.
const list = (
  sources: ReadonlyArray<ImageURISource & { uri: string }>,
  layoutWidth: number | undefined,
): ResolvedSource => {
  const first = sources[0] as ImageURISource & { uri: string }
  if (sources.length === 1) return single(first)

  if (sources.every((s) => typeof s.width === 'number')) {
    return {
      src: first.uri,
      srcSet: sources.map((s) => `${s.uri} ${s.width}w`).join(', '),
      sizes: layoutWidth === undefined ? '100vw' : `${layoutWidth}px`,
      width: undefined,
      height: undefined,
      request: undefined,
    }
  }

  if (sources.every((s) => typeof s.scale === 'number')) {
    const base = sources.find((s) => s.scale === 1) ?? first
    return {
      src: base.uri,
      srcSet: sources.map((s) => `${s.uri} ${s.scale}x`).join(', '),
      sizes: undefined,
      width: base.width,
      height: base.height,
      request: undefined,
    }
  }

  return single(first)
}

export const resolveSource = (
  source: ImageSource | undefined,
  src: string | undefined,
  srcSet: string | undefined,
  layoutWidth: number | undefined,
): ResolvedSource => {
  if (src !== undefined || srcSet !== undefined) {
    return {
      ...none,
      src: src ?? (srcSet === undefined ? undefined : firstCandidate(srcSet)),
      srcSet,
      sizes: srcSet !== undefined && /\d+w/.test(srcSet) ? '100vw' : undefined,
    }
  }
  if (source === undefined || source === null) return none
  if (typeof source === 'string') return { ...none, src: source }
  if (typeof source === 'number') {
    warnOnce('image-asset-id', ASSET_ID_WARNING)
    return none
  }
  if (Array.isArray(source)) {
    const sources = (source as ReadonlyArray<ImageURISource>).filter(hasURI)
    return sources.length === 0 ? none : list(sources, layoutWidth)
  }
  return hasURI(source as ImageURISource)
    ? single(source as ImageURISource & { uri: string })
    : none
}

export const resolveAssetSource = (
  source: ImageSource | undefined,
): ImageResolvedAssetSource | null => {
  if (typeof source === 'string') return { uri: source, scale: 1 }
  if (typeof source === 'number') {
    warnOnce('image-asset-id', ASSET_ID_WARNING)
    return null
  }
  const first = Array.isArray(source) ? (source as ReadonlyArray<ImageURISource>)[0] : source
  if (first === undefined || first === null || !hasURI(first as ImageURISource)) return null
  const { uri, width, height, scale } = first as ImageURISource & { uri: string }
  return { uri, width, height, scale: scale ?? 1 }
}

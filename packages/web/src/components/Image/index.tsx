import {
  createElement,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactElement,
  type SyntheticEvent,
} from 'react'

import { toDOMProps } from '../../render/domProps'
import { withHostMethods } from '../../render/hostMethods'
import { resolveTag } from '../../render/resolveTag'
import { useElementLayout } from '../../render/useElementLayout'
import { compileReset, compileStyle, flattenStyle, joinClassNames } from '../../style/compile'
import { useStyleRegistry } from '../../style/StyleRegistryContext'
import { hasDOM } from '../../utils/env'
import { resolveAssetSource, resolveSource, type ImageRequest } from './source'
import type { ImageProps, ImageResizeMode, ImageSize, ImageStatics } from './types'

export type {
  ImageErrorEvent,
  ImageInstance,
  ImageLoadEvent,
  ImageLoadEventData,
  ImageProgressEvent,
  ImageProps,
  ImageResizeMode,
  ImageResolvedAssetSource,
  ImageSize,
  ImageSource,
  ImageStatics,
  ImageURISource,
} from './types'

// The box. The image paints inside it, as on native, so the box style and
// the image fit are independent. `overflow: hidden` clips to the border radius.
const boxStyle = Object.freeze({
  backgroundColor: 'transparent',
  border: '0 solid black',
  boxSizing: 'border-box',
  display: 'flex',
  flexBasis: 'auto',
  flexDirection: 'column',
  flexShrink: 0,
  margin: 0,
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
  padding: 0,
  position: 'relative',
  zIndex: 0,
})

const fillStyle = Object.freeze({
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
  display: 'block',
  border: 0,
  margin: 0,
  padding: 0,
})

const hiddenStyle = Object.freeze({ visibility: 'hidden' })

const objectFitOf: Record<ImageResizeMode, string> = {
  cover: 'cover',
  contain: 'contain',
  stretch: 'fill',
  center: 'none',
  repeat: 'none',
}

const resizeModeOfObjectFit: Record<string, ImageResizeMode> = {
  cover: 'cover',
  contain: 'contain',
  fill: 'stretch',
  'scale-down': 'contain',
  none: 'center',
}

const maskSizeOf: Record<ImageResizeMode, string> = {
  cover: 'cover',
  contain: 'contain',
  stretch: '100% 100%',
  center: 'auto',
  repeat: 'auto',
}

const cssURL = (url: string): string => `url("${url.replace(/["\\]/g, '\\$&')}")`

const loadError = (uri: string | undefined): string => `Failed to load image: ${uri ?? ''}`

type ImgElement = HTMLImageElement

const sizeOf = (img: ImgElement): ImageSize => ({
  width: img.naturalWidth,
  height: img.naturalHeight,
})

const placeholderURI = (source: ImageProps['defaultSource']): string | undefined => {
  if (typeof source === 'string') return source
  if (typeof source === 'object' && source !== null) return source.uri
  return undefined
}

// Fetches a source with headers and hands the <img> an object URL.
const useRequestURL = (
  uri: string | undefined,
  request: ImageRequest | undefined,
): { url: string | undefined; error: string | undefined } => {
  const [state, setState] = useState<{
    uri: string | undefined
    url: string | undefined
    error: string | undefined
  }>({ uri: undefined, url: undefined, error: undefined })

  // The request object is new on each render. Its text is the effect key.
  const requestKey = request === undefined ? undefined : JSON.stringify(request)

  useEffect(() => {
    if (uri === undefined || requestKey === undefined) return
    const { method, headers, body } = JSON.parse(requestKey) as ImageRequest
    const controller = new AbortController()
    let objectURL: string | undefined

    const init: RequestInit = { method, signal: controller.signal }
    if (headers !== undefined) init.headers = headers
    if (body !== undefined) init.body = body

    fetch(uri, init)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.blob()
      })
      .then((blob) => {
        objectURL = URL.createObjectURL(blob)
        setState({ uri, url: objectURL, error: undefined })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const message = error instanceof Error ? error.message : String(error)
        setState({ uri, url: undefined, error: `${loadError(uri)} (${message})` })
      })

    return () => {
      controller.abort()
      if (objectURL !== undefined) URL.revokeObjectURL(objectURL)
    }
  }, [uri, requestKey])

  // A result for another URI is stale.
  return state.uri === uri ? state : { url: undefined, error: undefined }
}

function ImageComponent(props: ImageProps): ReactElement {
  const {
    alt,
    blurRadius,
    crossOrigin,
    decoding,
    defaultSource,
    fetchPriority,
    height,
    loading,
    onError,
    onLayout,
    onLoad,
    onLoadEnd,
    onLoadStart,
    ref,
    referrerPolicy,
    resizeMode: resizeModeProp,
    source,
    src,
    srcSet,
    style,
    tintColor: tintColorProp,
    width,
    // Native only.
    fadeDuration: _fadeDuration,
    loadingIndicatorSource: _loadingIndicatorSource,
    onProgress: _onProgress,
    progressiveRenderingEnabled: _progressiveRenderingEnabled,
    resizeMethod: _resizeMethod,
    ...rest
  } = props

  const element = useRef<HTMLElement | null>(null)
  const img = useRef<ImgElement | null>(null)
  useImperativeHandle(ref, () => withHostMethods(element.current as HTMLElement), [])
  useElementLayout(element, onLayout)
  const registry = useStyleRegistry()

  const flat = flattenStyle(style) ?? {}
  const {
    resizeMode: styleResizeMode,
    objectFit,
    tintColor: styleTintColor,
    overlayColor: _overlayColor,
    ...userBoxStyle
  } = flat

  const resizeMode: ImageResizeMode =
    (typeof objectFit === 'string' ? resizeModeOfObjectFit[objectFit] : undefined) ??
    resizeModeProp ??
    (styleResizeMode as ImageResizeMode | undefined) ??
    'cover'
  const tintColor = tintColorProp ?? styleTintColor
  const painted = resizeMode === 'repeat' || tintColor !== undefined

  const styleWidth = userBoxStyle['width'] ?? width
  const resolved = resolveSource(
    source,
    src,
    srcSet,
    typeof styleWidth === 'number' ? styleWidth : undefined,
  )
  const requested = useRequestURL(resolved.src, resolved.request)
  const currentSrc = resolved.request === undefined ? resolved.src : requested.url

  // The handlers an effect calls, always the latest ones.
  const handlers = useRef({ onLoad, onLoadStart, onLoadEnd, onError })
  useEffect(() => {
    handlers.current = { onLoad, onLoadStart, onLoadEnd, onError }
  })

  // One load cycle per URI. `loadedSrc` tells the placeholder when to go.
  const [loadedSrc, setLoadedSrc] = useState<string | undefined>(undefined)
  const firedFor = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (resolved.src === undefined) return
    firedFor.current = undefined
    handlers.current.onLoadStart?.()
  }, [resolved.src])

  const fireLoad = useCallback((target: ImgElement): void => {
    const uri = target.currentSrc || target.src
    if (firedFor.current === uri) return
    firedFor.current = uri
    setLoadedSrc(target.src)
    const { width: naturalWidth, height: naturalHeight } = sizeOf(target)
    handlers.current.onLoad?.({
      nativeEvent: { source: { uri, width: naturalWidth, height: naturalHeight } },
    })
    handlers.current.onLoadEnd?.()
  }, [])

  const fireError = useCallback((target: ImgElement): void => {
    const uri = target.currentSrc || target.src
    if (firedFor.current === uri) return
    firedFor.current = uri
    handlers.current.onError?.({ nativeEvent: { error: loadError(uri) } })
    handlers.current.onLoadEnd?.()
  }, [])

  const handleLoad = useCallback(
    (event: SyntheticEvent<ImgElement>) => fireLoad(event.currentTarget),
    [fireLoad],
  )
  const handleError = useCallback(
    (event: SyntheticEvent<ImgElement>) => fireError(event.currentTarget),
    [fireError],
  )

  // A cached image, or one the server HTML already loaded, completes before
  // React attaches `onLoad`.
  useEffect(() => {
    const target = img.current
    if (target === null || currentSrc === undefined || !target.complete) return
    if (target.naturalWidth > 0) fireLoad(target)
    else fireError(target)
  })

  const requestError = requested.error
  useEffect(() => {
    if (requestError === undefined) return
    if (firedFor.current === resolved.src) return
    firedFor.current = resolved.src
    handlers.current.onError?.({ nativeEvent: { error: requestError } })
    handlers.current.onLoadEnd?.()
  }, [requestError, resolved.src])

  const { tag, role } = resolveTag(rest, 'div', true)

  const sizeStyle = {
    width: userBoxStyle['width'] ?? width ?? resolved.width,
    height: userBoxStyle['height'] ?? height ?? resolved.height,
  }
  const boxClassName = joinClassNames(
    compileReset('rn-image', boxStyle, registry),
    compileStyle([sizeStyle, userBoxStyle], registry),
  )

  const label = alt ?? rest.accessibilityLabel ?? rest['aria-label']
  const domProps = toDOMProps(rest)
  domProps['className'] = boxClassName
  domProps['ref'] = element
  if (role !== undefined) domProps['role'] = role
  else if (painted && label !== undefined && label !== '') {
    domProps['role'] = 'img'
    domProps['aria-label'] = label
  }

  const imgStyle = {
    objectFit: objectFitOf[resizeMode],
    filter: blurRadius !== undefined && blurRadius > 0 ? `blur(${blurRadius}px)` : undefined,
  }

  const placeholder = placeholderURI(defaultSource)
  const showPlaceholder =
    placeholder !== undefined && (currentSrc === undefined || loadedSrc !== currentSrc)

  let paintStyle: Record<string, unknown> | undefined
  if (painted && currentSrc !== undefined) {
    const url = cssURL(currentSrc)
    const repeat = resizeMode === 'repeat' ? 'repeat' : 'no-repeat'
    paintStyle =
      tintColor === undefined
        ? {
            backgroundImage: url,
            backgroundRepeat: repeat,
            backgroundPosition: 'center',
            backgroundSize: 'auto',
          }
        : {
            backgroundColor: tintColor,
            WebkitMaskImage: url,
            maskImage: url,
            WebkitMaskRepeat: repeat,
            maskRepeat: repeat,
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
            WebkitMaskSize: maskSizeOf[resizeMode],
            maskSize: maskSizeOf[resizeMode],
          }
  }

  const children: ReactElement[] = [
    <img
      key="img"
      ref={img}
      src={currentSrc}
      srcSet={resolved.srcSet}
      sizes={resolved.sizes}
      alt={painted ? '' : (label ?? '')}
      aria-hidden={painted ? true : undefined}
      draggable={false}
      crossOrigin={crossOrigin}
      referrerPolicy={referrerPolicy}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding={decoding}
      onLoad={handleLoad}
      onError={handleError}
      className={compileStyle([fillStyle, imgStyle, painted && hiddenStyle], registry)}
    />,
  ]
  if (showPlaceholder) {
    children.unshift(
      <img
        key="placeholder"
        src={placeholder}
        alt=""
        aria-hidden
        draggable={false}
        className={compileStyle([fillStyle, imgStyle], registry)}
      />,
    )
  }
  if (paintStyle !== undefined) {
    children.push(
      <div key="paint" aria-hidden className={compileStyle([fillStyle, paintStyle], registry)} />,
    )
  }

  return createElement(tag, domProps, ...children)
}

const loadSize = (uri: string): Promise<ImageSize> =>
  new Promise((resolve, reject) => {
    if (!hasDOM()) {
      reject(new Error('Image.getSize needs a DOM'))
      return
    }
    const probe = document.createElement('img')
    probe.addEventListener('load', () => resolve(sizeOf(probe)), { once: true })
    probe.addEventListener('error', () => reject(new Error(loadError(uri))), { once: true })
    probe.src = uri
  })

const fetchObjectURL = async (uri: string, headers: Record<string, string>): Promise<string> => {
  const response = await fetch(uri, { headers })
  if (!response.ok) throw new Error(`${loadError(uri)} (HTTP ${response.status})`)
  return URL.createObjectURL(await response.blob())
}

const withCallbacks = (
  promise: Promise<ImageSize>,
  success: ((width: number, height: number) => void) | undefined,
  failure: ((error: unknown) => void) | undefined,
): Promise<ImageSize> | undefined => {
  if (success === undefined) return promise
  promise.then(
    (size) => success(size.width, size.height),
    (error: unknown) => failure?.(error),
  )
  return undefined
}

type SizeSuccess = (width: number, height: number) => void
type SizeFailure = (error: unknown) => void

function getSize(uri: string): Promise<ImageSize>
function getSize(uri: string, success: SizeSuccess, failure?: SizeFailure): void
function getSize(
  uri: string,
  success?: SizeSuccess,
  failure?: SizeFailure,
): Promise<ImageSize> | undefined {
  return withCallbacks(loadSize(uri), success, failure)
}

function getSizeWithHeaders(uri: string, headers: Record<string, string>): Promise<ImageSize>
function getSizeWithHeaders(
  uri: string,
  headers: Record<string, string>,
  success: SizeSuccess,
  failure?: SizeFailure,
): void
function getSizeWithHeaders(
  uri: string,
  headers: Record<string, string>,
  success?: SizeSuccess,
  failure?: SizeFailure,
): Promise<ImageSize> | undefined {
  const promise = fetchObjectURL(uri, headers).then((url) =>
    loadSize(url).finally(() => URL.revokeObjectURL(url)),
  )
  return withCallbacks(promise, success, failure)
}

const statics: ImageStatics = {
  getSize,
  getSizeWithHeaders,

  prefetch: (url) => loadSize(url).then(() => true),

  // The browser does not expose its cache.
  queryCache: () => Promise.resolve({}),

  resolveAssetSource,
}

export const Image: typeof ImageComponent & ImageStatics = Object.assign(ImageComponent, statics)

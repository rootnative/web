import { act, createRef } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { cleanup, render } from '../../test/render'
import { Image } from './index'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// A PNG of the given size, drawn here so the tests need no network.
const png = (width: number, height: number, color = '#f00'): string => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d') as CanvasRenderingContext2D
  context.fillStyle = color
  context.fillRect(0, 0, width, height)
  return canvas.toDataURL('image/png')
}

const BROKEN = 'data:image/png;base64,AAAA'

const box = (container: HTMLElement): HTMLElement => container.firstElementChild as HTMLElement
const img = (container: HTMLElement): HTMLImageElement =>
  box(container).querySelector('img:not([aria-hidden])') as HTMLImageElement
// The img that loads the source when a div paints it (repeat, tintColor).
const loader = (container: HTMLElement): HTMLImageElement => {
  const images = box(container).querySelectorAll('img')
  return images[images.length - 1] as HTMLImageElement
}

const nextLoad = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 50)
  })

const settle = async (): Promise<void> => {
  await act(nextLoad)
}

describe('Image', () => {
  test('renders a box with an img that fills it', () => {
    const { container } = render(
      <Image source={{ uri: png(2, 2) }} style={{ width: 40, height: 30 }} />,
    )
    const element = box(container)
    expect(element.tagName).toBe('DIV')
    const computed = getComputedStyle(element)
    expect(computed.width).toBe('40px')
    expect(computed.height).toBe('30px')
    expect(computed.overflow).toBe('hidden')

    const image = img(container)
    expect(image.getAttribute('alt')).toBe('')
    expect(image.draggable).toBe(false)
    const imageStyle = getComputedStyle(image)
    expect(imageStyle.position).toBe('absolute')
    expect(imageStyle.width).toBe('40px')
    expect(imageStyle.height).toBe('30px')
    expect(imageStyle.objectFit).toBe('cover')
  })

  test('has no height without a style, as on native', () => {
    const { container } = render(<Image source={{ uri: png(2, 2) }} />)
    const computed = getComputedStyle(box(container))
    expect(computed.height).toBe('0px')
    // A column parent stretches it, as `alignItems: 'stretch'` does on native.
    expect(computed.width).toBe(getComputedStyle(container).width)
  })

  test('takes its default size from the source', () => {
    const { container } = render(<Image source={{ uri: png(2, 2), width: 24, height: 12 }} />)
    const computed = getComputedStyle(box(container))
    expect(computed.width).toBe('24px')
    expect(computed.height).toBe('12px')
  })

  test('width and height props size the box', () => {
    const { container } = render(<Image source={{ uri: png(2, 2) }} width={50} height={20} />)
    expect(getComputedStyle(box(container)).width).toBe('50px')
    expect(getComputedStyle(box(container)).height).toBe('20px')
  })

  describe('fit', () => {
    test.each([
      ['cover', 'cover'],
      ['contain', 'contain'],
      ['stretch', 'fill'],
      ['center', 'none'],
    ] as const)('resizeMode %s is object-fit %s', (mode, fit) => {
      const { container } = render(<Image source={{ uri: png(2, 2) }} resizeMode={mode} />)
      expect(getComputedStyle(img(container)).objectFit).toBe(fit)
    })

    test('style.resizeMode works, the prop wins, objectFit wins over both', () => {
      const { container, rerender } = render(
        <Image source={{ uri: png(2, 2) }} style={{ resizeMode: 'contain' }} />,
      )
      expect(getComputedStyle(img(container)).objectFit).toBe('contain')
      rerender(
        <Image
          source={{ uri: png(2, 2) }}
          resizeMode="stretch"
          style={{ resizeMode: 'contain' }}
        />,
      )
      expect(getComputedStyle(img(container)).objectFit).toBe('fill')
      rerender(
        <Image source={{ uri: png(2, 2) }} resizeMode="stretch" style={{ objectFit: 'contain' }} />,
      )
      expect(getComputedStyle(img(container)).objectFit).toBe('contain')
    })

    test('repeat paints a repeating background and hides the img', () => {
      const uri = png(2, 2)
      const { container } = render(
        <Image source={{ uri }} resizeMode="repeat" style={{ width: 20, height: 20 }} />,
      )
      const image = loader(container)
      expect(getComputedStyle(image).visibility).toBe('hidden')
      expect(image.getAttribute('aria-hidden')).toBe('true')
      const paint = box(container).lastElementChild as HTMLElement
      expect(paint.tagName).toBe('DIV')
      const computed = getComputedStyle(paint)
      expect(computed.backgroundImage).toBe(`url("${uri}")`)
      expect(computed.backgroundRepeat).toBe('repeat')
    })

    test('blurRadius is a blur filter', () => {
      const { container } = render(<Image source={{ uri: png(2, 2) }} blurRadius={3} />)
      expect(getComputedStyle(img(container)).filter).toBe('blur(3px)')
    })
  })

  describe('tintColor', () => {
    test('paints the color through a mask of the image', () => {
      const uri = png(2, 2)
      const { container } = render(
        <Image
          source={{ uri }}
          tintColor="rgb(0, 0, 255)"
          resizeMode="contain"
          style={{ width: 20, height: 20 }}
        />,
      )
      const paint = box(container).lastElementChild as HTMLElement
      const computed = getComputedStyle(paint)
      expect(computed.backgroundColor).toBe('rgb(0, 0, 255)')
      expect(computed.maskImage).toBe(`url("${uri}")`)
      expect(computed.maskSize).toBe('contain')
      expect(computed.maskRepeat).toBe('no-repeat')
    })

    test('comes from the style too, and names the box as the image', () => {
      const { container } = render(
        <Image
          source={{ uri: png(2, 2) }}
          style={{ tintColor: 'red' }}
          accessibilityLabel="Logo"
        />,
      )
      const element = box(container)
      expect(element.getAttribute('role')).toBe('img')
      expect(element.getAttribute('aria-label')).toBe('Logo')
      expect(img(container)).toBeNull()
      expect(loader(container).getAttribute('alt')).toBe('')
    })
  })

  describe('sources', () => {
    test('a list with scales is a srcset', () => {
      const one = png(1, 1)
      const two = png(2, 2)
      const { container } = render(
        <Image
          source={[
            { uri: one, scale: 1 },
            { uri: two, scale: 2 },
          ]}
        />,
      )
      const image = img(container)
      expect(image.getAttribute('src')).toBe(one)
      expect(image.getAttribute('srcset')).toBe(`${one} 1x, ${two} 2x`)
    })

    test('a list with widths is a srcset with sizes from the style width', () => {
      const small = png(1, 1)
      const large = png(2, 2)
      const { container } = render(
        <Image
          source={[
            { uri: small, width: 400 },
            { uri: large, width: 800 },
          ]}
          style={{ width: 300 }}
        />,
      )
      const image = img(container)
      expect(image.getAttribute('srcset')).toBe(`${small} 400w, ${large} 800w`)
      expect(image.getAttribute('sizes')).toBe('300px')
    })

    test('src and srcSet props pass through', () => {
      const uri = png(1, 1)
      const { container } = render(<Image src={uri} srcSet={`${uri} 1x`} />)
      expect(img(container).getAttribute('src')).toBe(uri)
      expect(img(container).getAttribute('srcset')).toBe(`${uri} 1x`)
    })

    test('a string source is a URL', () => {
      const uri = png(1, 1)
      const { container } = render(<Image source={uri} />)
      expect(img(container).getAttribute('src')).toBe(uri)
    })

    test('headers fetch the image and load an object URL', async () => {
      const uri = 'https://example.test/private.png'
      const blob = await (await fetch(png(3, 2))).blob()
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response(blob, { status: 200 }))
      const onLoad = vi.fn()

      const { container } = render(
        <Image source={{ uri, headers: { Authorization: 'Bearer x' } }} onLoad={onLoad} />,
      )
      // The first act commits the object URL; the second covers its load.
      await settle()
      await settle()

      expect(fetchSpy).toHaveBeenCalledWith(
        uri,
        expect.objectContaining({ method: 'GET', headers: { Authorization: 'Bearer x' } }),
      )
      expect(img(container).getAttribute('src')).toMatch(/^blob:/)
      expect(onLoad).toHaveBeenCalledTimes(1)
      expect(onLoad.mock.calls[0]?.[0].nativeEvent.source).toMatchObject({ width: 3, height: 2 })
    })

    test('a failed request is an error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 403 }))
      const onError = vi.fn()
      const onLoadEnd = vi.fn()

      render(
        <Image
          source={{ uri: 'https://example.test/x.png', headers: { a: 'b' } }}
          onError={onError}
          onLoadEnd={onLoadEnd}
        />,
      )
      await settle()

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError.mock.calls[0]?.[0].nativeEvent.error).toContain('HTTP 403')
      expect(onLoadEnd).toHaveBeenCalledTimes(1)
    })
  })

  describe('events', () => {
    test('onLoadStart, onLoad with the size, then onLoadEnd', async () => {
      const calls: string[] = []
      const onLoad = vi.fn((event) => {
        calls.push('load')
        expect(event.nativeEvent.source).toMatchObject({ width: 4, height: 3 })
      })

      render(
        <Image
          source={{ uri: png(4, 3) }}
          onLoadStart={() => calls.push('start')}
          onLoad={onLoad}
          onLoadEnd={() => calls.push('end')}
        />,
      )
      await settle()

      expect(calls).toEqual(['start', 'load', 'end'])
    })

    test('onError then onLoadEnd for a broken image', async () => {
      const calls: string[] = []
      render(
        <Image
          source={{ uri: BROKEN }}
          onLoadStart={() => calls.push('start')}
          onLoad={() => calls.push('load')}
          onError={(event) => {
            calls.push('error')
            expect(event.nativeEvent.error).toContain('Failed to load image')
          }}
          onLoadEnd={() => calls.push('end')}
        />,
      )
      await settle()

      expect(calls).toEqual(['start', 'error', 'end'])
    })

    test('a cached image still reports its load once', async () => {
      const uri = png(5, 5)
      await Image.prefetch(uri)
      const onLoad = vi.fn()

      render(<Image source={{ uri }} onLoad={onLoad} />)
      await settle()

      expect(onLoad).toHaveBeenCalledTimes(1)
    })

    test('a new source starts a new load cycle', async () => {
      const onLoad = vi.fn()
      const onLoadStart = vi.fn()
      const { rerender } = render(
        <Image source={{ uri: png(1, 1) }} onLoad={onLoad} onLoadStart={onLoadStart} />,
      )
      await settle()
      rerender(<Image source={{ uri: png(2, 1) }} onLoad={onLoad} onLoadStart={onLoadStart} />)
      await settle()

      expect(onLoadStart).toHaveBeenCalledTimes(2)
      expect(onLoad).toHaveBeenCalledTimes(2)
    })
  })

  describe('defaultSource', () => {
    test('shows until the image loads', async () => {
      const placeholder = png(1, 1, '#0f0')
      const { container } = render(
        <Image source={{ uri: png(8, 8) }} defaultSource={{ uri: placeholder }} />,
      )
      const before = box(container).querySelectorAll('img')
      expect(before).toHaveLength(2)
      expect(before[0]?.getAttribute('src')).toBe(placeholder)
      expect(before[0]?.getAttribute('aria-hidden')).toBe('true')

      await settle()
      expect(box(container).querySelectorAll('img')).toHaveLength(1)
    })
  })

  describe('accessibility', () => {
    test('alt, accessibilityLabel, and aria-label name the image', () => {
      const uri = png(1, 1)
      const { container, rerender } = render(<Image source={{ uri }} alt="A" />)
      expect(img(container).getAttribute('alt')).toBe('A')
      rerender(<Image source={{ uri }} accessibilityLabel="B" />)
      expect(img(container).getAttribute('alt')).toBe('B')
      rerender(<Image source={{ uri }} aria-label="C" />)
      expect(img(container).getAttribute('alt')).toBe('C')
    })

    test('a role picks the box element', () => {
      const { container } = render(<Image source={{ uri: png(1, 1) }} role="figure" />)
      expect(box(container).tagName).toBe('FIGURE')
    })

    test('web loading hints pass to the img', () => {
      const { container } = render(
        <Image source={{ uri: png(1, 1) }} loading="lazy" fetchPriority="low" decoding="async" />,
      )
      const image = img(container)
      expect(image.getAttribute('loading')).toBe('lazy')
      expect(image.getAttribute('fetchpriority')).toBe('low')
      expect(image.getAttribute('decoding')).toBe('async')
    })

    test('ref and testID are on the box', () => {
      const ref = createRef<HTMLElement>()
      const { container } = render(<Image source={{ uri: png(1, 1) }} ref={ref} testID="hero" />)
      expect(ref.current).toBe(box(container))
      expect(box(container).getAttribute('data-testid')).toBe('hero')
    })
  })

  describe('statics', () => {
    test('getSize resolves the size, as a promise or callbacks', async () => {
      const uri = png(6, 4)
      await expect(Image.getSize(uri)).resolves.toEqual({ width: 6, height: 4 })

      const size = await new Promise<[number, number]>((resolve, reject) => {
        Image.getSize(uri, (width, height) => resolve([width, height]), reject)
      })
      expect(size).toEqual([6, 4])
    })

    test('getSize rejects a broken image', async () => {
      await expect(Image.getSize(BROKEN)).rejects.toThrow('Failed to load image')
      const failure = await new Promise<unknown>((resolve) => {
        Image.getSize(BROKEN, () => resolve('success'), resolve)
      })
      expect(failure).toBeInstanceOf(Error)
    })

    test('getSizeWithHeaders fetches, then measures', async () => {
      const blob = await (await fetch(png(7, 2))).blob()
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response(blob, { status: 200 }))
      await expect(
        Image.getSizeWithHeaders('https://example.test/a.png', { a: 'b' }),
      ).resolves.toEqual({ width: 7, height: 2 })
      expect(fetchSpy).toHaveBeenCalledWith('https://example.test/a.png', { headers: { a: 'b' } })
    })

    test('prefetch resolves true, and rejects a broken image', async () => {
      await expect(Image.prefetch(png(1, 1))).resolves.toBe(true)
      await expect(Image.prefetch(BROKEN)).rejects.toThrow()
    })

    test('queryCache knows nothing', async () => {
      await expect(Image.queryCache(['a'])).resolves.toEqual({})
    })

    test('resolveAssetSource is exposed', () => {
      expect(Image.resolveAssetSource({ uri: '/a.png' })).toEqual({ uri: '/a.png', scale: 1 })
    })
  })
})

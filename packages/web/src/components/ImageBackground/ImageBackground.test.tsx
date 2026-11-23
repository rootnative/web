import { act, createRef } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { Text } from '../Text'
import { cleanup, render } from '../../test/render'
import type { HostInstance } from '../View/types'
import { ImageBackground } from './index'

afterEach(cleanup)

const png = (width: number, height: number): string => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d') as CanvasRenderingContext2D
  context.fillStyle = '#f00'
  context.fillRect(0, 0, width, height)
  return canvas.toDataURL('image/png')
}

const outer = (container: HTMLElement): HTMLElement => container.firstElementChild as HTMLElement
// The first child of the view is the box of the image.
const imageBox = (container: HTMLElement): HTMLElement =>
  outer(container).firstElementChild as HTMLElement
const rect = (element: Element): DOMRect => element.getBoundingClientRect()

// A load of an image is a task after the render. `act` waits for it and commits its update.
const settle = async (): Promise<void> => {
  await act(() => new Promise<void>((resolve) => setTimeout(resolve, 50)))
}

describe('ImageBackground', () => {
  test('the image fills the view, under the children', () => {
    const { container } = render(
      <ImageBackground source={{ uri: png(2, 2) }} style={{ width: 120, height: 80 }}>
        <Text>Over the image</Text>
      </ImageBackground>,
    )
    const view = outer(container)
    const image = imageBox(container)

    expect(view.children).toHaveLength(2)
    expect(image.querySelector('img')).not.toBeNull()
    expect(getComputedStyle(image).position).toBe('absolute')
    expect(rect(image).width).toBe(120)
    expect(rect(image).height).toBe(80)
    expect(rect(image).left).toBe(rect(view).left)
    expect(rect(image).top).toBe(rect(view).top)
    // The children come after the image in the DOM, so they paint on top of it.
    expect(view.lastElementChild?.textContent).toBe('Over the image')
  })

  test('a view sized by its parent gives its size to the image', () => {
    const { container } = render(
      <div style={{ width: 200, height: 50, display: 'flex' }}>
        <ImageBackground source={{ uri: png(2, 2) }} style={{ flex: 1 }} />
      </div>,
    )
    const wrapper = container.firstElementChild as HTMLElement
    const view = wrapper.firstElementChild as HTMLElement
    const image = view.firstElementChild as HTMLElement
    expect(rect(view).width).toBe(200)
    expect(rect(image).width).toBe(200)
    expect(rect(image).height).toBe(50)
  })

  test('imageStyle goes to the image and wins over the size of the view', () => {
    const { container } = render(
      <ImageBackground
        source={{ uri: png(2, 2) }}
        style={{ width: 120, height: 80, padding: 10 }}
        imageStyle={{ width: 30, opacity: 0.5, borderRadius: 6 }}
      />,
    )
    const image = imageBox(container)
    expect(rect(image).width).toBe(30)
    expect(rect(image).height).toBe(80)
    expect(getComputedStyle(image).opacity).toBe('0.5')
    expect(getComputedStyle(image).borderTopLeftRadius).toBe('6px')
    expect(getComputedStyle(outer(container)).paddingTop).toBe('10px')
  })

  test('the image props go to the image, and the view gets none of them', async () => {
    const { container } = render(
      <ImageBackground
        source={{ uri: png(2, 2) }}
        alt="A mountain"
        resizeMode="contain"
        style={{ width: 40, height: 40 }}
      />,
    )
    const label = (): string | null =>
      imageBox(container).getAttribute('aria-label') ??
      imageBox(container).querySelector('img')?.getAttribute('alt') ??
      null
    expect(label()).toBe('A mountain')
    await settle()
    expect(label()).toBe('A mountain')
    expect(outer(container).getAttribute('aria-label')).toBeNull()
    const img = imageBox(container).querySelector('img') as HTMLImageElement
    expect(getComputedStyle(img).objectFit).toBe('contain')
  })

  test('ref is the view, and imageRef is the image', () => {
    const ref = createRef<HostInstance>()
    const imageRef = createRef<HostInstance>()
    const { container } = render(
      <ImageBackground
        ref={ref}
        imageRef={imageRef}
        source={{ uri: png(2, 2) }}
        style={{ width: 40, height: 40 }}
      />,
    )
    expect(ref.current).toBe(outer(container))
    expect(imageRef.current).toBe(imageBox(container))
    expect(typeof ref.current?.measure).toBe('function')
  })

  test('onLoad of the image fires', async () => {
    const onLoad = vi.fn()
    render(
      <ImageBackground
        source={{ uri: png(3, 2) }}
        onLoad={onLoad}
        style={{ width: 40, height: 40 }}
      />,
    )
    await settle()
    await vi.waitFor(() => expect(onLoad).toHaveBeenCalledOnce())
    expect(onLoad.mock.calls[0]?.[0].nativeEvent.source).toMatchObject({ width: 3, height: 2 })
  })
})

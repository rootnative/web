import { afterEach, describe, expect, test, vi } from 'vitest'

import { stubNavigator } from '../../test/navigator'
import { Share, type ShareContent } from './index'

describe('Share', () => {
  let restore: (() => void) | undefined

  afterEach(() => {
    restore?.()
  })

  const stubShare = (result: Promise<void>): ReturnType<typeof vi.fn> => {
    const share = vi.fn(() => result)
    restore = stubNavigator('share', share)
    return share
  }

  test('shares the title, the message as text, and the URL', async () => {
    const share = stubShare(Promise.resolve())

    const result = await Share.share({
      title: 'Trip',
      message: 'See the plan',
      url: 'https://example.com/trip',
    })

    expect(share).toHaveBeenCalledWith({
      title: 'Trip',
      text: 'See the plan',
      url: 'https://example.com/trip',
    })
    expect(result).toEqual({ action: 'sharedAction', activityType: null })
  })

  test('leaves out the fields that the content does not have', async () => {
    const share = stubShare(Promise.resolve())
    await Share.share({ message: 'Hello' })
    expect(share).toHaveBeenCalledWith({ text: 'Hello' })
  })

  test('a closed share sheet resolves dismissedAction, as on iOS', async () => {
    stubShare(Promise.reject(new DOMException('Share canceled', 'AbortError')))
    await expect(Share.share({ url: 'https://example.com/' })).resolves.toEqual({
      action: 'dismissedAction',
      activityType: null,
    })
  })

  test('another browser error rejects as it is', async () => {
    const error = new DOMException('Needs a click', 'NotAllowedError')
    stubShare(Promise.reject(error))
    await expect(Share.share({ url: 'https://example.com/' })).rejects.toBe(error)
  })

  test('rejects with Unsupported platform when the browser has no share sheet', async () => {
    restore = stubNavigator('share', undefined)
    await expect(Share.share({ message: 'Hello' })).rejects.toThrowError('Unsupported platform')
  })

  test("throws React Native's errors at once for bad arguments", () => {
    stubShare(Promise.resolve())
    expect(() => Share.share(null as unknown as ShareContent)).toThrowError(
      'Content to share must be a valid object',
    )
    expect(() => Share.share({ title: 'x' } as unknown as ShareContent)).toThrowError(
      'At least one of URL or message is required',
    )
    expect(() =>
      Share.share({ message: 'x' }, null as unknown as Record<string, never>),
    ).toThrowError('Options must be a valid object')
  })

  test('has the two action names', () => {
    expect(Share.sharedAction).toBe('sharedAction')
    expect(Share.dismissedAction).toBe('dismissedAction')
  })
})

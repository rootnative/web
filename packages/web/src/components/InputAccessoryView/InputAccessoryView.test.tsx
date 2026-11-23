import { afterEach, describe, expect, test, vi } from 'vitest'

import { Text } from '../Text'
import { cleanup, render } from '../../test/render'
import { resetWarnings } from '../../utils/warn'
import { InputAccessoryView } from './index'

afterEach(() => {
  cleanup()
  resetWarnings()
  vi.restoreAllMocks()
})

describe('InputAccessoryView', () => {
  test('renders nothing and warns once, as on Android', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <>
        <InputAccessoryView nativeID="toolbar" backgroundColor="#eee">
          <Text>Done</Text>
        </InputAccessoryView>
        <InputAccessoryView nativeID="other">
          <Text>Other</Text>
        </InputAccessoryView>
      </>,
    )
    expect(container.innerHTML).toBe('')
    expect(warn).toHaveBeenCalledOnce()
    expect(String(warn.mock.calls[0]?.[0])).toContain(
      '<InputAccessoryView> is only supported on iOS.',
    )
  })
})

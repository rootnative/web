import { expect, test } from 'vitest'

import { invariant } from './invariant'

test('a true condition passes', () => {
  expect(() => invariant(1, 'never')).not.toThrow()
})

test('a false condition throws an Invariant Violation with the message', () => {
  let caught: unknown
  try {
    invariant(0, 'The list has no cell 3')
  } catch (error) {
    caught = error
  }
  expect(caught).toBeInstanceOf(Error)
  expect((caught as Error).name).toBe('Invariant Violation')
  expect((caught as Error).message).toBe('The list has no cell 3')
})

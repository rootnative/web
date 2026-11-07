import { afterEach, beforeEach } from 'vitest'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

// Tells React that tests wrap updates in act(). Without it, each act() call logs a warning.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

// A React warning fails the test. To expect an error, spy on console.error in the test.
const consoleError = console.error
let logged: unknown[][] = []

beforeEach(() => {
  logged = []
  console.error = (...args: unknown[]) => {
    logged.push(args)
    consoleError(...args)
  }
})

afterEach(() => {
  console.error = consoleError
  const first = logged[0]
  if (first !== undefined) {
    throw new Error(`console.error was called during the test: ${first.map(String).join(' ')}`)
  }
})

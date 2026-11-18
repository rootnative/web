// React Native's `invariant` package: the error has the name `Invariant Violation`.
export function invariant(condition: unknown, message: string): asserts condition {
  if (condition) return
  const error = new Error(message)
  error.name = 'Invariant Violation'
  throw error
}

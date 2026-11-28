// A name that Expo can import but `@rootnative/web` doesn't have yet. The import works, so an
// app that never uses the name runs. A use throws an error that names it.
export const missing = (name) => {
  const fail = () => {
    throw new Error(
      `${name} is not in @rootnative/web yet. See https://rootnative.github.io/web/status.`,
    )
  }
  return new Proxy(function missingExport() {}, { get: fail, apply: fail, construct: fail })
}

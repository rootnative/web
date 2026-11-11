// Replaces one member of `navigator` for a test and returns the undo. The engines have different
// members (Firefox on a desktop has no `share`, WebKit no `vibrate`), so the tests set them.
export const stubNavigator = (name: string, value: unknown): (() => void) => {
  Object.defineProperty(navigator, name, { configurable: true, writable: true, value })
  return () => {
    Reflect.deleteProperty(navigator, name)
  }
}

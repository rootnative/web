// A controllable window.matchMedia for tests. The browser's own preference
// can't change from inside a test, so the fake owns `matches` per query.
export class FakeMediaQueryList extends EventTarget {
  matches = false
  readonly media: string

  constructor(media: string) {
    super()
    this.media = media
  }

  set(matches: boolean): void {
    if (this.matches === matches) return
    this.matches = matches
    this.dispatchEvent(new Event('change'))
  }
}

const nativeMatchMedia = window.matchMedia

export const installFakeMatchMedia = (): {
  get: (query: string) => FakeMediaQueryList
  restore: () => void
} => {
  const lists = new Map<string, FakeMediaQueryList>()
  const get = (query: string): FakeMediaQueryList => {
    let list = lists.get(query)
    if (list === undefined) {
      list = new FakeMediaQueryList(query)
      lists.set(query, list)
    }
    return list
  }

  Object.defineProperty(window, 'matchMedia', { configurable: true, value: get })

  return {
    get,
    restore: () => {
      Object.defineProperty(window, 'matchMedia', { configurable: true, value: nativeMatchMedia })
    },
  }
}

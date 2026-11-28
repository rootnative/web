// The event emitter of React Native. `DeviceEventEmitter` is one shared instance, and each
// `NativeEventEmitter` puts its listeners on it, as in React Native and react-native-web. The web
// has no native side, so only JavaScript emits events on it.
class EventEmitter {
  #registry = new Map()

  addListener(eventType, listener, context) {
    if (typeof listener !== 'function') {
      throw new TypeError('EventEmitter.addListener(...): 2nd argument must be a function.')
    }
    let listeners = this.#registry.get(eventType)
    if (listeners === undefined) {
      listeners = new Set()
      this.#registry.set(eventType, listeners)
    }
    const registration = { context, listener, remove: () => listeners.delete(registration) }
    listeners.add(registration)
    return registration
  }

  // A listener that an earlier listener removes during the same emit still runs, as in React
  // Native: the emit works on a copy of the list.
  emit(eventType, ...args) {
    const listeners = this.#registry.get(eventType)
    if (listeners === undefined) return
    for (const { context, listener } of Array.from(listeners)) listener.apply(context, args)
  }

  removeAllListeners(eventType) {
    if (eventType === undefined) this.#registry.clear()
    else this.#registry.delete(eventType)
  }

  listenerCount(eventType) {
    return this.#registry.get(eventType)?.size ?? 0
  }
}

export const DeviceEventEmitter = new EventEmitter()

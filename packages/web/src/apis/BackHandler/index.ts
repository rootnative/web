export type BackPressHandler = () => boolean | null | undefined

export type BackHandlerSubscription = { remove: () => void }

// The browser has no hardware back button, and the history belongs to the
// router. Handlers register and remove as on native, but never fire.
const handlers = new Set<BackPressHandler>()

export const BackHandler: {
  addEventListener: (
    eventName: 'hardwareBackPress',
    handler: BackPressHandler,
  ) => BackHandlerSubscription
  removeEventListener: (eventName: 'hardwareBackPress', handler: BackPressHandler) => void
  exitApp: () => void
} = {
  addEventListener: (eventName, handler) => {
    if (eventName !== 'hardwareBackPress') {
      throw new Error(`BackHandler: unknown event "${String(eventName)}"`)
    }
    handlers.add(handler)
    return { remove: () => handlers.delete(handler) }
  },

  removeEventListener: (_eventName, handler) => {
    handlers.delete(handler)
  },

  // A page cannot close itself unless a script opened it.
  exitApp: () => {},
}

// For tests.
export const backPressHandlerCount = (): number => handlers.size

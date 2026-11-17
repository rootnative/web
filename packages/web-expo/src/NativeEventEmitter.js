import { DeviceEventEmitter } from './DeviceEventEmitter.js'

// React Native's `NativeEventEmitter`, as react-native-web has it on the web. The native module
// of the constructor has no use, because no native side sends events. The listeners go on the
// shared `DeviceEventEmitter`. `@expo/log-box` makes one when it loads.
export class NativeEventEmitter {
  addListener(eventType, listener, context) {
    return DeviceEventEmitter.addListener(eventType, listener, context)
  }

  emit(eventType, ...args) {
    DeviceEventEmitter.emit(eventType, ...args)
  }

  removeAllListeners(eventType) {
    if (eventType === undefined || eventType === null) {
      throw new Error('`NativeEventEmitter.removeAllListener()` requires a non-null argument.')
    }
    DeviceEventEmitter.removeAllListeners(eventType)
  }

  listenerCount(eventType) {
    return DeviceEventEmitter.listenerCount(eventType)
  }
}

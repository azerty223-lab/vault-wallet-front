function createStore(initialState) {
  let state = { ...initialState }
  const listeners = new Set()

  return {
    getState() {
      return { ...state }
    },
    setState(updater) {
      const patch = typeof updater === 'function' ? updater(state) : updater
      state = { ...state, ...patch }
      listeners.forEach(fn => fn(state))
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}

export const store = createStore({
  currentScreen: 'captcha',
  captchaToken: null,
})

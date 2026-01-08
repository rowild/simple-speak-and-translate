import { useRegisterSW } from 'virtual:pwa-register/vue'

declare const __APP_VERSION__: string

// Check for updates every 12 hours (as a fallback for long-running sessions)
const UPDATE_INTERVAL = 12 * 60 * 60 * 1000

export function useAppUpdate() {
  const {
    needRefresh,
    offlineReady,
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        // Check once on app start (registration)
        registration.update()

        // For very long sessions, check every 12 hours
        setInterval(() => {
          registration.update()
        }, UPDATE_INTERVAL)
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error)
    }
  })

  const currentVersion = __APP_VERSION__

  function applyUpdate() {
    // This tells the waiting SW to skipWaiting and take control
    // The page will reload automatically when the new SW takes over
    updateServiceWorker(true)
  }

  function dismissUpdate() {
    needRefresh.value = false
  }

  return {
    // needRefresh is true when a new SW is installed and waiting
    updateAvailable: needRefresh,
    offlineReady,
    currentVersion,
    applyUpdate,
    dismissUpdate
  }
}

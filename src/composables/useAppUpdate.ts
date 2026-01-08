import { useRegisterSW } from "virtual:pwa-register/vue";
import { watch, ref } from "vue";

declare const __APP_VERSION__: string;

// Check for updates every 12 hours (as a fallback for long-running sessions)
const UPDATE_INTERVAL = 12 * 60 * 60 * 1000;
const UPDATE_APPLIED_KEY = "pwa-update-applied";

export function useAppUpdate() {
  const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        // Check once on app start (registration)
        registration.update();

        // For very long sessions, check every 12 hours
        setInterval(() => {
          registration.update();
        }, UPDATE_INTERVAL);
      }
    },
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });

  // Track if we should show the update banner
  const showUpdateBanner = ref(false);

  // Check if we just came back from applying an update
  const justUpdated = sessionStorage.getItem(UPDATE_APPLIED_KEY);
  if (justUpdated) {
    // Clear the flag - we've reloaded with the new version
    sessionStorage.removeItem(UPDATE_APPLIED_KEY);
    // Don't show the banner even if needRefresh is true
    // (the SW lifecycle might not have fully settled yet)
  }

  // Watch needRefresh and only show banner if we didn't just update
  watch(
    needRefresh,
    (value) => {
      if (value && !justUpdated) {
        showUpdateBanner.value = true;
      }
    },
    { immediate: true }
  );

  const currentVersion = __APP_VERSION__;

  function applyUpdate() {
    // Hide the banner immediately
    showUpdateBanner.value = false;
    // Set flag so we know not to show banner after reload
    sessionStorage.setItem(UPDATE_APPLIED_KEY, "true");
    // This tells the waiting SW to skipWaiting and take control
    // The page will reload automatically when the new SW takes over
    updateServiceWorker(true);
  }

  function dismissUpdate() {
    showUpdateBanner.value = false;
  }

  return {
    // Use our controlled state instead of raw needRefresh
    updateAvailable: showUpdateBanner,
    offlineReady,
    currentVersion,
    applyUpdate,
    dismissUpdate,
  };
}

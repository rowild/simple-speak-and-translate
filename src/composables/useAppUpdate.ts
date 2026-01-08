import { useRegisterSW } from "virtual:pwa-register/vue";
import { watch, ref } from "vue";

declare const __APP_VERSION__: string;

// Check for updates every 12 hours (as a fallback for long-running sessions)
const UPDATE_INTERVAL = 12 * 60 * 60 * 1000;
const LAST_SEEN_VERSION_KEY = "pwa-last-seen-version";

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

  const currentVersion = __APP_VERSION__;
  
  // Track if we should show the update banner
  const showUpdateBanner = ref(false);

  // Version-based detection: compare running version with last seen version
  // If different, the user already has new code (via hard reload, update click, or cache clear)
  const lastSeenVersion = localStorage.getItem(LAST_SEEN_VERSION_KEY);
  const versionChanged = lastSeenVersion !== null && lastSeenVersion !== currentVersion;
  
  // Always update the stored version to current
  localStorage.setItem(LAST_SEEN_VERSION_KEY, currentVersion);

  // Watch needRefresh and only show banner if version hasn't already changed
  // If version changed, user already has the new code - no need to show update banner
  watch(
    needRefresh,
    (value) => {
      if (value && !versionChanged) {
        // New SW is waiting AND we're still on the old version
        // This is a genuine update notification
        showUpdateBanner.value = true;
      }
    },
    { immediate: true }
  );

  function applyUpdate() {
    // Hide the banner immediately
    showUpdateBanner.value = false;
    // Update stored version (will match after reload, preventing banner)
    localStorage.setItem(LAST_SEEN_VERSION_KEY, currentVersion);
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

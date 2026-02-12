// Background Service Worker - Singleton Window Management
// Opens a standalone app window instead of a popup

let dashboardWindowId = null;

const WINDOW_CONFIG = {
  url: 'options/options.html',
  type: 'popup',
  width: 500,
  height: 800
};

/**
 * Handle extension icon click
 * Opens a new window or focuses the existing one (Singleton pattern)
 */
chrome.action.onClicked.addListener(async () => {
  console.log('[Background] Icon clicked. Current windowId:', dashboardWindowId);

  if (dashboardWindowId !== null) {
    // Window exists - try to focus it
    try {
      await chrome.windows.update(dashboardWindowId, { focused: true });
      console.log('[Background] Focused existing window:', dashboardWindowId);
      return;
    } catch (error) {
      // Window no longer exists (was closed without triggering onRemoved)
      console.log('[Background] Window not found, creating new one...');
      dashboardWindowId = null;
    }
  }

  // Create new window
  try {
    const window = await chrome.windows.create(WINDOW_CONFIG);
    dashboardWindowId = window.id;
    console.log('[Background] Created new window:', dashboardWindowId);
  } catch (error) {
    console.error('[Background] Error creating window:', error);
  }
});

/**
 * Handle window close event
 * Resets the tracked window ID when our window is closed
 */
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === dashboardWindowId) {
    console.log('[Background] Dashboard window closed:', windowId);
    dashboardWindowId = null;
  }
});
